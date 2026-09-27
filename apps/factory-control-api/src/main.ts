import express from 'express';
import crypto from 'node:crypto';

const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'256kb'}));
const repository=process.env.FACTORY_REPOSITORY ?? 'alnatourm/ogroup-ai-factory';
const githubToken=process.env.GITHUB_TOKEN?.trim();
const controlToken=process.env.FACTORY_CONTROL_TOKEN?.trim();
if(!githubToken) throw new Error('GITHUB_TOKEN_REQUIRED');
if(!controlToken) throw new Error('FACTORY_CONTROL_TOKEN_REQUIRED');

function authorized(req:express.Request){const h=req.header('authorization')??'';const [s,t]=h.split(' ');if(s!=='Bearer'||!t)return false;const a=Buffer.from(t),b=Buffer.from(controlToken!);return a.length===b.length&&crypto.timingSafeEqual(a,b)}
app.get('/health',(_req,res)=>res.json({data:{status:'ok',service:'factory-control-api'},meta:{}}));
app.use('/api/factory',(req,res,next)=>{if(!authorized(req)){res.status(401).json({error:{code:'UNAUTHENTICATED',message:'Factory control authentication required.'}});return}next()});

async function github(path:string,init:RequestInit={}){
 const response=await fetch(`https://api.github.com/repos/${repository}${path}`,{...init,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${githubToken}`,'X-GitHub-Api-Version':'2022-11-28',...(init.headers??{})}});
 if(!response.ok)throw new Error(`GITHUB_${response.status}_${path}`); return response;
}
type Issue={number:number;title:string;body?:string|null;updated_at:string;created_at:string;html_url:string;labels?:Array<{name?:string}>};
function statusOf(issue:Issue){const labels=new Set((issue.labels??[]).map(x=>x.name));for(const [label,status] of [['factory-status:waiting-human','WAITING_HUMAN'],['factory-status:waiting-dependency','WAITING_DEPENDENCY'],['factory-status:verifying','VERIFYING'],['factory-status:retrying','RETRYING'],['factory-status:running','RUNNING'],['factory-status:completed','COMPLETED'],['factory-status:failed','FAILED'],['factory-status:stalled','STALLED']] as const)if(labels.has(label))return status;return 'QUEUED'}
function targetOf(body=''){return body.match(/^Target-Repository:\s*([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\s*$/mi)?.[1]??null}
async function issues(){const r=await github('/issues?state=all&labels=factory-work&per_page=100');return (await r.json() as Issue[]).filter(x=>!('pull_request' in x))}
app.get('/api/factory/runs',async(_req,res,next)=>{try{const rows=(await issues()).map(i=>({runId:`factory-work:${i.number}`,issueNumber:i.number,title:i.title,targetRepository:targetOf(i.body??''),status:statusOf(i),updatedAt:i.updated_at,createdAt:i.created_at,evidenceUrl:i.html_url}));res.json({data:rows,meta:{repository}})}catch(e){next(e)}});
app.post('/api/factory/runs',async(req,res,next)=>{try{
 const intent=typeof req.body?.intent==='string'?req.body.intent.trim():'';const target=typeof req.body?.targetRepository==='string'?req.body.targetRepository.trim():'';
 if(intent.length<10||!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(target)){res.status(400).json({error:{code:'VALIDATION_ERROR',message:'intent and targetRepository are required.'}});return}
 const title=typeof req.body?.title==='string'&&req.body.title.trim()?req.body.title.trim():intent.slice(0,72);
 const body=`Target-Repository: ${target}\n\n## Product intent\n${intent}\n\n## Created by\nOGroup AI Factory Dashboard\n`;
 const r=await github('/issues',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:`Factory product: ${title}`,body,labels:['factory-work','factory-status:waiting-dependency']})});
 const issue=await r.json() as Issue;res.status(201).json({data:{runId:`factory-work:${issue.number}`,issueNumber:issue.number,status:'WAITING_DEPENDENCY',targetRepository:target,evidenceUrl:issue.html_url},meta:{}})
 }catch(e){next(e)}});
app.post('/api/factory/runs/:issue/continue',async(req,res,next)=>{try{const n=Number(req.params.issue);if(!Number.isInteger(n)){res.status(400).json({error:{code:'VALIDATION_ERROR'}});return}
 await github(`/issues/${n}/comments`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body:`FACTORY_DASHBOARD_CONTINUE factory-work:${n} ${new Date().toISOString()}`})});
 await github('/dispatches',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event_type:'factory-watchdog-continue',client_payload:{runId:`factory-work:${n}`,source:'dashboard'}})});
 res.json({data:{accepted:true,runId:`factory-work:${n}`},meta:{}})}catch(e){next(e)}});
app.get('/api/factory/activity',async(_req,res,next)=>{try{const r=await github('/actions/runs?per_page=30');const j=await r.json() as {workflow_runs?:Array<any>};res.json({data:(j.workflow_runs??[]).map(x=>({id:x.id,name:x.name,status:x.status,conclusion:x.conclusion,updatedAt:x.updated_at,url:x.html_url,sha:x.head_sha})),meta:{repository}})}catch(e){next(e)}});
app.use((e:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{console.error(e instanceof Error?e.message:String(e));res.status(502).json({error:{code:'FACTORY_UPSTREAM_ERROR',message:'Factory control operation failed.'}})});
const port=Number(process.env.PORT??'3000');app.listen(port,'0.0.0.0',()=>console.log(JSON.stringify({type:'FACTORY_CONTROL_API_STARTED',port,repository})));
