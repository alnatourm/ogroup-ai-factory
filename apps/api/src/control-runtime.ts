import express from 'express';

const repository = process.env.FACTORY_REPOSITORY ?? 'alnatourm/ogroup-ai-factory';
const token = process.env.GITHUB_TOKEN?.trim();
const port = Number(process.env.PORT ?? '3000');
const allowedOrigin = process.env.DASHBOARD_ORIGIN?.trim() ?? '';

if (!token) throw new Error('GITHUB_TOKEN_REQUIRED');

async function github(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`GITHUB_${response.status}_${path}`);
  return response;
}

interface Issue { number:number; title:string; body?:string|null; updated_at:string; labels?:Array<{name?:string}>; pull_request?:unknown }
interface Run { id:number; name:string; status:string; conclusion:string|null; updated_at:string; html_url:string }
interface Runs { workflow_runs?:Run[] }

const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'256kb'}));
app.use((req,res,next)=>{
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin',allowedOrigin);
    res.setHeader('Access-Control-Allow-Headers','content-type,x-tenant-id');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  }
  if(req.method==='OPTIONS'){res.status(204).send();return}
  next();
});

app.get('/health',(_req,res)=>res.json({status:'ok',service:'ogroup-factory-control'}));

app.get('/api/v1/factory/snapshot',async(_req,res,next)=>{
 try{
  const [issuesResponse,runsResponse]=await Promise.all([
   github('/issues?state=open&labels=factory-work&per_page=100'),
   github('/actions/runs?per_page=30')
  ]);
  const issues=(await issuesResponse.json() as Issue[]).filter(x=>!x.pull_request);
  const runs=(await runsResponse.json() as Runs).workflow_runs??[];
  const mapped=issues.map(issue=>{
   const labels=(issue.labels??[]).map(x=>x.name??'');
   const status=labels.find(x=>x.startsWith('factory-status:'))?.replace('factory-status:','').replace('-','_').toUpperCase()??'QUEUED';
   return {id:`factory-work:${issue.number}`,name:issue.title,status,updatedAt:issue.updated_at};
  });
  const attention=mapped.filter(x=>x.status==='WAITING_HUMAN');
  res.json({data:{runs:mapped,activity:runs.slice(0,15).map(x=>({id:x.id,name:x.name,status:x.status,conclusion:x.conclusion,updatedAt:x.updated_at,url:x.html_url})),agents:[],health:{status:'HEALTHY',watchdog:'ACTIVE',source:'github'},attention},meta:{source:'live'}});
 }catch(e){next(e)}
});

app.post('/api/v1/factory/runs',async(req,res,next)=>{
 try{
  const intent=typeof req.body?.intent==='string'?req.body.intent.trim():'';
  if(intent.length<16){res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Product intent is too short.'}});return}
  const response=await github('/issues',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:`Factory product: ${intent.slice(0,72)}`,body:`## Product intent\n\n${intent}\n\n## Source\nProduct Owner Dashboard`,labels:['factory-work']})});
  const issue=await response.json() as Issue;
  res.status(202).json({data:{runId:`factory-work:${issue.number}`,status:'QUEUED'},meta:{}});
 }catch(e){next(e)}
});

app.post('/api/v1/factory/runs/:runId/gates/:gate/:decision',async(req,res,next)=>{
 try{
  const match=req.params.runId.match(/factory-work:(\d+)/); const gate=req.params.gate; const decision=req.params.decision;
  if(!match||!['design','production'].includes(gate)||!['approve','changes'].includes(decision)){res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Invalid Factory gate command.'}});return}
  const feedback=typeof req.body?.feedback==='string'?req.body.feedback.trim():'';
  if(decision==='changes'&&!feedback){res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Feedback is required.'}});return}
  const body=decision==='approve'?`FACTORY_HUMAN_GATE_APPROVED ${gate}`:`FACTORY_HUMAN_GATE_CHANGES ${gate}\n\n${feedback}`;
  await github(`/issues/${match[1]}/comments`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body})});
  res.json({data:{runId:req.params.runId,gate,decision,recorded:true},meta:{}});
 }catch(e){next(e)}
});

app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
 console.error(error); res.status(500).json({error:{code:'FACTORY_CONTROL_ERROR',message:'Factory control operation failed.'}});
});

app.listen(port,'0.0.0.0',()=>console.log(JSON.stringify({type:'FACTORY_CONTROL_READY',port,repository})));
