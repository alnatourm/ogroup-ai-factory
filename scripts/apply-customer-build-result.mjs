/* global process, fetch, console */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root=process.argv[2];
const sourceRepository=process.env.SOURCE_REPOSITORY;
const sourceIssue=process.env.SOURCE_ISSUE;
const runId=process.env.RUN_ID;
const token=process.env.GH_TOKEN;
if(!root||!sourceRepository||!sourceIssue||!runId||!token) throw new Error('FACTORY_DELIVERY_CONTEXT_REQUIRED');
const response=await fetch(`https://api.github.com/repos/${sourceRepository}/issues/${sourceIssue}/comments?per_page=100`,{headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28'}});
if(!response.ok) throw new Error(`FACTORY_RESULT_HTTP_${response.status}`);
const comments=await response.json();
const groups=new Map();
for(const comment of comments){
  const body=comment.body||''; const first=body.indexOf('\n'); const header=first<0?body:body.slice(0,first); const data=first<0?'':body.slice(first+1).trim();
  const match=header.match(/^FACTORY_ANTIGRAVITY_RESULT (\S+) (\d+) (\d+)\/(\d+)$/);
  if(!match||match[1]!==runId) continue;
  const buildId=match[2]; const group=groups.get(buildId)||{total:Number(match[4]),parts:new Map()}; group.parts.set(Number(match[3]),data); groups.set(buildId,group);
}
const complete=[...groups.entries()].filter(([,g])=>g.parts.size===g.total).sort((a,b)=>Number(b[0])-Number(a[0]));
if(!complete.length) throw new Error('FACTORY_RESULT_NOT_READY');
const [buildId,group]=complete[0]; let encoded=''; for(let i=1;i<=group.total;i++) encoded+=group.parts.get(i)||'';
const payload=JSON.parse(zlib.gunzipSync(Buffer.from(encoded,'base64')).toString('utf8'));
if(payload.buildSlice!=='customer-product') throw new Error('FACTORY_RESULT_NOT_CUSTOMER_PRODUCT');
for(const file of payload.files||[]){
  const p=String(file.path||'').replaceAll('\\','/');
  if(!p||p.includes('..')||p.startsWith('/')||p.startsWith('.github/')||p.startsWith('factory-evidence/')||p==='.env'||p.startsWith('.env.')) throw new Error(`FACTORY_RESULT_UNSAFE_PATH: ${p}`);
  if(typeof file.content!=='string') throw new Error(`FACTORY_RESULT_INVALID_CONTENT: ${p}`);
  const destination=path.join(root,p); fs.mkdirSync(path.dirname(destination),{recursive:true}); fs.writeFileSync(destination,file.content);
}
console.log(JSON.stringify({type:'FACTORY_CUSTOMER_RESULT_APPLIED',runId,buildId,files:payload.files.map(file=>file.path)}));
