/* global process, fetch, console, setTimeout */
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
const buildSlice=process.env.FACTORY_BUILD_SLICE?.trim()||'customer-product';
const productIntent=process.env.FACTORY_PRODUCT_INTENT?.trim()||'';
const allSources=collect(root);
const genericBuild=buildSlice==='customer-product';
const slices={
  'dashboard-shell-home': {goal:'Implement only the shared application shell, navigation, language/RTL controls, and Factory Home screen.',files:['src/App.tsx','src/styles.css','src/main.tsx']},
  'dashboard-create-product': {goal:'Implement only the Create Product screen and the minimal shared code needed to reach it.',files:['src/App.tsx','src/styles.css']},
  'dashboard-control-room': {goal:'Implement only the Project Control Room screen and its measurable evidence/status presentation.',files:['src/App.tsx','src/styles.css']},
  'dashboard-design-review': {goal:'Implement only Design Approval and Product Review screens.',files:['src/App.tsx','src/styles.css']},
  'dashboard-agents-health': {goal:'Implement only Agent Registry and Factory Health/Watchdog screens.',files:['src/App.tsx','src/styles.css']},
  'dashboard-attention-activity': {goal:'Implement only Needs My Attention and Factory Activity screens.',files:['src/App.tsx','src/styles.css']}
};
const slice=slices[buildSlice];
if(!genericBuild&&!slice) throw new Error(`UNKNOWN_FACTORY_BUILD_SLICE: ${buildSlice}`);
if(genericBuild&&!productIntent) throw new Error('FACTORY_PRODUCT_INTENT_REQUIRED');
const sourceAllow=new Set(['package.json','tsconfig.json','vite.config.ts','index.html',...(slice?.files??[])]);
const sources=genericBuild?allSources.slice(0,80):allSources.filter(source=>sourceAllow.has(source.target));
const instructions=genericBuild?`You are the OGroup AI Factory customer-product Build Agent.
Build the requested customer software in the supplied target repository.
Product intent: ${productIntent}
Work only inside the target product repository. Preserve existing useful code. Create a runnable coherent MVP, not a demo placeholder.
Return ONLY JSON: {"summary":"...","files":[{"path":"...","content":"complete file contents"}]}.
Never modify .github, credentials, secrets, factory-evidence or lockfiles. Do not embed secrets. Keep the change bounded enough to verify in one execution.`:`You are the OGroup AI Factory Antigravity Build Agent.
Implement ONE bounded slice of the APPROVED AI Factory Dashboard design.
Slice ID: ${buildSlice}
Slice goal: ${slice.goal}
Approved Stitch review: 100/100, Arabic/English, RTL-ready, responsive, no blockers.
Do not implement other Dashboard screens in this interaction.
Preserve existing working behavior outside this slice.
Return ONLY JSON: {"summary":"...","files":[{"path":"src/...","content":"complete file contents"}]}.
Return only files changed for this slice. Prefer these files: ${slice.files.join(', ')}.
Never modify .github, credentials, secrets, factory-evidence or lockfiles.`;
const startResponse=await fetch(`${endpoint}/interactions`,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':apiKey,'Api-Revision':'2026-05-20'},body:JSON.stringify({agent,input:instructions,environment:{type:'remote',sources:sources.map(s=>({type:'inline',target:s.target,content:s.content}))},background:true,store:true,agent_config:{type:'antigravity',max_total_tokens:50000}})});
if(!startResponse.ok) throw new Error(`ANTIGRAVITY_HTTP_${startResponse.status}: ${(await startResponse.text()).slice(0,500)}`);
let result=await startResponse.json();
if(!result.id) throw new Error('ANTIGRAVITY_RESPONSE_MISSING_ID');
console.log(JSON.stringify({type:'ANTIGRAVITY_INTERACTION_STARTED',interactionId:result.id,status:result.status||'unknown'}));

const extractText=(value)=>value.output_text || (value.steps||[]).filter(step=>step.type==='model_output').flatMap(step=>step.content||[]).filter(item=>item.type==='text').map(item=>item.text).filter(Boolean).join('\n');
const terminal=new Set(['completed','failed','incomplete']);
const deadline=Date.now()+8*60*1000;
while(!terminal.has(result.status) && Date.now()<deadline){
  await new Promise(resolve=>setTimeout(resolve,10000));
  const poll=await fetch(`${endpoint}/interactions/${encodeURIComponent(result.id)}`,{headers:{'x-goog-api-key':apiKey}});
  if(!poll.ok) throw new Error(`ANTIGRAVITY_POLL_HTTP_${poll.status}: ${(await poll.text()).slice(0,300)}`);
  result=await poll.json();
  console.log(JSON.stringify({type:'ANTIGRAVITY_INTERACTION_POLL',interactionId:result.id,status:result.status||'unknown'}));
}
if(!terminal.has(result.status)) throw new Error(`ANTIGRAVITY_POLL_TIMEOUT: ${result.id}`);
if(result.status!=='completed') {
  const partialText=extractText(result);
  const diagnostics={
    type:'ANTIGRAVITY_TERMINAL_DIAGNOSTIC',
    interactionId:result.id,
    status:result.status,
    environmentId:result.environment_id||null,
    incompleteDetails:result.incomplete_details||result.incompleteDetails||null,
    error:result.error||null,
    usage:result.usage||result.usage_metadata||result.usageMetadata||null,
    stepTypes:Array.isArray(result.steps)?result.steps.map(step=>step?.type||'unknown'):[],
    partialOutputPresent:Boolean(partialText),
    partialOutputLength:partialText?.length||0,
    responseKeys:Object.keys(result).filter(key=>!['output_text','steps'].includes(key))
  };
  console.log(JSON.stringify(diagnostics));
  fs.writeFileSync(output,JSON.stringify({provider:'google-antigravity',interactionId:result.id,status:result.status,diagnostics}));
  throw new Error(`ANTIGRAVITY_TERMINAL_${String(result.status).toUpperCase()}: ${result.id}`);
}
const text=extractText(result);
if(!text) throw new Error(`ANTIGRAVITY_OUTPUT_MISSING: ${result.id}`);
const payload=JSON.parse(text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
if(!Array.isArray(payload.files)||!payload.files.length) throw new Error('ANTIGRAVITY_NO_IMPLEMENTATION_FILES');
for(const file of payload.files){const p=String(file.path||'').replaceAll('\\\\','/');if(p.includes('..')||p.startsWith('/')||p.startsWith('.github/')||p.startsWith('factory-evidence/'))throw new Error(`ANTIGRAVITY_UNSAFE_PATH: ${p}`);if(typeof file.content!=='string')throw new Error(`ANTIGRAVITY_INVALID_CONTENT: ${p}`);}
fs.writeFileSync(output,JSON.stringify({provider:'google-antigravity',interactionId:result.id,buildSlice,summary:payload.summary||null,files:payload.files}));
console.log(JSON.stringify({type:'FACTORY_ANTIGRAVITY_BUILD_READY',interactionId:result.id,buildSlice,files:payload.files.map(f=>f.path)}));
