/* global process, fetch, console */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { Buffer } from 'node:buffer';

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
if(encoded.length>8_000_000) throw new Error('FACTORY_RESULT_TOO_LARGE');
const decoded=zlib.gunzipSync(Buffer.from(encoded,'base64'),{maxOutputLength:12_000_000}).toString('utf8');
const payload=JSON.parse(decoded);
if(payload.buildSlice!=='customer-product') throw new Error('FACTORY_RESULT_NOT_CUSTOMER_PRODUCT');
if(!Array.isArray(payload.files)||payload.files.length===0||payload.files.length>250) throw new Error('FACTORY_RESULT_INVALID_FILE_COUNT');
let totalBytes=0;
for(const file of payload.files){
  const p=String(file.path||'').replaceAll('\\','/');
  const lower=p.toLowerCase();
  const segments=lower.split('/');
  const sensitiveName=segments.some((segment)=>segment==='.env'||segment.startsWith('.env.')||segment==='.npmrc'||segment==='.pypirc'||segment==='.netrc'||segment==='credentials'||segment==='credentials.json'||segment==='service-account.json'||segment==='id_rsa'||segment==='id_ed25519'||segment.endsWith('.pem')||segment.endsWith('.key')||segment.endsWith('.p12')||segment.endsWith('.pfx'));
  const sensitiveDir=segments.some((segment)=>segment==='.ssh'||segment==='.aws'||segment==='.config/gcloud');
  if(!p||p.includes('..')||p.startsWith('/')||lower.startsWith('.github/')||lower.startsWith('factory-evidence/')||sensitiveName||sensitiveDir) throw new Error(`FACTORY_RESULT_UNSAFE_PATH: ${p}`);
  if(typeof file.content!=='string') throw new Error(`FACTORY_RESULT_INVALID_CONTENT: ${p}`);
  const bytes=Buffer.byteLength(file.content,'utf8'); totalBytes+=bytes;
  if(bytes>1_000_000||totalBytes>10_000_000) throw new Error('FACTORY_RESULT_CONTENT_LIMIT_EXCEEDED');
  const destination=path.join(root,p); fs.mkdirSync(path.dirname(destination),{recursive:true}); fs.writeFileSync(destination,file.content);
}
console.log(JSON.stringify({type:'FACTORY_CUSTOMER_RESULT_APPLIED',runId,buildId,files:payload.files.map(file=>file.path)}));
