/* global process, fetch, console */
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || '.';
const output = process.argv[3] || 'factory-antigravity-result.json';
const apiKey = process.env.ANTIGRAVITY_API_KEY?.trim();
if (!apiKey) throw new Error('ANTIGRAVITY_API_KEY_REQUIRED');
const endpoint = (process.env.ANTIGRAVITY_ENDPOINT || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
const agent = process.env.ANTIGRAVITY_AGENT || 'antigravity-preview-09-2026';
const skip = new Set(['node_modules','.git','dist','factory-evidence']);
function collect(dir) {
  const out=[];
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    if (skip.has(entry.name)) continue;
    const p=path.join(dir,entry.name);
    if (entry.isDirectory()) out.push(...collect(p));
    else if (/\.(tsx?|jsx?|css|html|json|md)$/.test(entry.name) && fs.statSync(p).size < 120000) {
      out.push({target:path.relative(root,p).replaceAll('\\\\','/'),content:fs.readFileSync(p,'utf8')});
    }
  }
  return out;
}
const sources=collect(root);
const instructions=`You are the OGroup AI Factory Antigravity Build Agent.
Implement the APPROVED AI Factory Dashboard design in the supplied repository.
Approved Stitch review: 100/100, 9/9 screens, Arabic 9/9, RTL 9/9, responsive 9/9, no blockers.
Required screens: Factory Home, Create Product, Project Control Room, Design Approval, Product Review, Agent Registry, Factory Health/Watchdog, Needs My Attention, Activity.
Preserve architecture and working behavior. Implement real bilingual Arabic/English product code, RTL-ready, responsive and Product-Owner-first.
Return ONLY JSON: {"summary":"...","files":[{"path":"src/...","content":"complete file contents"}]}.
Only changed product files. Never modify .github, credentials, secrets, factory-evidence or lockfiles.`;
const response=await fetch(`${endpoint}/interactions`,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':apiKey,'Api-Revision':'2026-05-20'},body:JSON.stringify({agent,input:instructions,environment:{type:'remote',sources:sources.map(s=>({type:'inline',target:s.target,content:s.content}))},background:false,store:true,agent_config:{type:'antigravity',max_total_tokens:50000}})});
if(!response.ok) throw new Error(`ANTIGRAVITY_HTTP_${response.status}: ${(await response.text()).slice(0,500)}`);
const result=await response.json();
const text=result.output_text || (result.steps||[]).filter(s=>s.type==='model_output').flatMap(s=>s.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('\n');
if(!result.id || !text) throw new Error('ANTIGRAVITY_OUTPUT_INVALID');
const payload=JSON.parse(text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
if(!Array.isArray(payload.files)||!payload.files.length) throw new Error('ANTIGRAVITY_NO_IMPLEMENTATION_FILES');
for(const file of payload.files){const p=String(file.path||'').replaceAll('\\\\','/');if(p.includes('..')||p.startsWith('/')||p.startsWith('.github/')||p.startsWith('factory-evidence/'))throw new Error(`ANTIGRAVITY_UNSAFE_PATH: ${p}`);if(typeof file.content!=='string')throw new Error(`ANTIGRAVITY_INVALID_CONTENT: ${p}`);}
fs.writeFileSync(output,JSON.stringify({provider:'google-antigravity',interactionId:result.id,summary:payload.summary||null,files:payload.files}));
console.log(JSON.stringify({type:'FACTORY_ANTIGRAVITY_BUILD_READY',interactionId:result.id,files:payload.files.map(f=>f.path)}));
