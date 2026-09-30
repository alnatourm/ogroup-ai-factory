import express from 'express';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { createCipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';

const databaseUrl=process.env.DATABASE_URL?.trim()??'';
const sql=databaseUrl?postgres(databaseUrl,{max:5}):null;
const db=sql?drizzle(sql):null;

const repository = process.env.FACTORY_REPOSITORY ?? 'alnatourm/ogroup-ai-factory';
const controlApiKey = process.env.FACTORY_CONTROL_API_KEY?.trim() ?? '';
const authRequired = process.env.FACTORY_REQUIRE_AUTH === 'true';
const token = process.env.GITHUB_TOKEN?.trim();
const port = Number(process.env.PORT ?? '3000');
const allowedOrigin = process.env.DASHBOARD_ORIGIN?.trim() ?? '';
const sessionTtlMs = 7*24*60*60*1000;

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

interface Issue { number:number; title:string; body?:string|null; created_at?:string; updated_at:string; html_url?:string; labels?:Array<{name?:string}>; pull_request?:unknown }
interface Comment { id:number; body?:string|null; created_at:string; user?:{login?:string} }
interface Run { id:number; name:string; status:string; conclusion:string|null; updated_at:string; html_url:string }
interface Runs { workflow_runs?:Run[] }

function cleanName(intent:string){ const first=(intent.split(/\n|\.|:/)[0]??'').replace(/^(build|create|make)\s+/i,'').trim(); return first.slice(0,80)||'New Product'; }
function slugify(name:string){ return name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'factory-product'; }
function targetFromBody(body:string|null|undefined){ return body?.match(/## Target repository\s*\n+`?([^\n`]+)`?/i)?.[1]?.trim()||null; }
function statusOf(issue:Issue){ const labels=(issue.labels??[]).map(x=>x.name??''); return labels.find(x=>x.startsWith('factory-status:'))?.replace('factory-status:','').replace(/-/g,'_').toUpperCase()??'QUEUED'; }

const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'256kb'}));
function tenantFromRequest(req:express.Request):string|null { return (resTenant.get(req)??null); }
const resTenant=new WeakMap<express.Request,string>();
function safeTenantSlug(value:string){ return value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,36)||'tenant'; }
function requireTenant(req:express.Request,res:express.Response):string|null {
  const tenant=tenantFromRequest(req);
  if(!tenant){ res.status(401).json({error:{code:'TENANT_REQUIRED',message:'Tenant context is required.'}}); return null; }
  return tenant;
}

app.use((req,res,next)=>{
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin',allowedOrigin);
    res.setHeader('Access-Control-Allow-Credentials','true');
    res.setHeader('Access-Control-Allow-Headers','content-type,x-tenant-id');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
  }
  if(req.method==='OPTIONS'){res.status(204).send();return}
  next();
});

app.use('/api/v1/factory',async(req,res,next)=>{
  try{
   if(!authRequired){const legacy=req.header('x-tenant-id')?.trim();if(legacy)resTenant.set(req,legacy);next();return}
   if(!sql){res.status(503).json({error:{code:'FACTORY_AUTH_DATABASE_REQUIRED'}});return}
   const header=req.header('authorization')??''; const bearer=header.startsWith('Bearer ')?header.slice(7).trim():'';
   if(!bearer){res.status(401).json({error:{code:'UNAUTHORIZED',message:'Authentication is required.'}});return}
   if(controlApiKey&&bearer===controlApiKey){const tenant=req.header('x-tenant-id')?.trim();if(!tenant){res.status(401).json({error:{code:'TENANT_REQUIRED'}});return}resTenant.set(req,tenant);next();return}
   const tokenHash=createHash('sha256').update(bearer).digest('hex');
   const sessions=await sql`select user_id from sessions where token_hash=${tokenHash} and revoked_at is null and expires_at>now() limit 1`;
   if(!sessions[0]){res.status(401).json({error:{code:'UNAUTHORIZED'}});return}
   const memberships=await sql`select tenant_id from memberships where user_id=${sessions[0].user_id} order by created_at asc,id asc limit 1`;
   if(!memberships[0]){res.status(403).json({error:{code:'MEMBERSHIP_NOT_PROVISIONED'}});return}
   resTenant.set(req,String(memberships[0].tenant_id)); next();
  }catch(e){next(e)}
});

app.get('/health',async(_req,res)=>{
 if(!db||!sql){res.json({status:'ok',service:'ogroup-factory-control',database:'not-configured'});return}
 try{await sql`select 1`;res.json({status:'ok',service:'ogroup-factory-control',database:'connected'})}
 catch{res.status(503).json({status:'degraded',service:'ogroup-factory-control',database:'unavailable'})}
});

app.post('/internal/v1/auth/session/introspect',async(req,res,next)=>{
 try{
  if(!controlApiKey||(req.header('authorization')??'')!==`Bearer ${controlApiKey}`){res.status(401).json({error:{code:'UNAUTHORIZED'}});return}
  if(!sql){res.status(503).json({error:{code:'DATABASE_REQUIRED'}});return}
  const token=typeof req.body?.token==='string'?req.body.token.trim():''; if(!token){res.json({data:{active:false}});return}
  const tokenHash=createHash('sha256').update(token).digest('hex'); const rows=await sql`select s.user_id,m.tenant_id,m.id membership_id from sessions s join memberships m on m.user_id=s.user_id where s.token_hash=${tokenHash} and s.revoked_at is null and s.expires_at>now() order by m.created_at asc,m.id asc limit 1`;
  res.json({data:rows[0]?{active:true,userId:String(rows[0].user_id),tenantId:String(rows[0].tenant_id),membershipId:String(rows[0].membership_id)}:{active:false}});
 }catch(e){next(e)}
});

app.post('/internal/v1/auth/session/revoke',async(req,res,next)=>{
 try{
  if(!controlApiKey||(req.header('authorization')??'')!==`Bearer ${controlApiKey}`){res.status(401).json({error:{code:'UNAUTHORIZED'}});return}
  if(!sql){res.status(503).json({error:{code:'DATABASE_REQUIRED'}});return}
  const token=typeof req.body?.token==='string'?req.body.token.trim():''; if(!token){res.status(400).json({error:{code:'TOKEN_REQUIRED'}});return}
  const tokenHash=createHash('sha256').update(token).digest('hex'); await sql`update sessions set revoked_at=coalesce(revoked_at,now()) where token_hash=${tokenHash}`;
  res.status(204).send();
 }catch(e){next(e)}
});

app.post('/internal/v1/auth/google/session',async(req,res,next)=>{
 try{
  if(!controlApiKey||(req.header('authorization')??'')!==`Bearer ${controlApiKey}`){res.status(401).json({error:{code:'UNAUTHORIZED'}});return}
  if(!sql){res.status(503).json({error:{code:'DATABASE_REQUIRED'}});return}
  await sql`create table if not exists external_identities (provider text not null,subject text not null,user_id uuid not null references users(id) on delete cascade,email text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(provider,subject))`;
  await sql`create index if not exists external_identities_user_idx on external_identities(user_id)`;
  const subject=typeof req.body?.subject==='string'?req.body.subject.trim():'';
  const email=typeof req.body?.email==='string'?req.body.email.trim().toLowerCase():'';
  if(!subject||!email){res.status(400).json({error:{code:'INVALID_GOOGLE_IDENTITY'}});return}
  const identities=await sql`select user_id from external_identities where provider='google' and subject=${subject} limit 1`;
  let userId=identities[0]?.user_id?String(identities[0].user_id):'';
  if(!userId){
   const users=await sql`select id from users where lower(email)=${email} limit 1`;
   if(!users[0]){res.status(403).json({error:{code:'MEMBERSHIP_NOT_PROVISIONED'}});return}
   userId=String(users[0].id);
   const membership=await sql`select id from memberships where user_id=${userId} limit 1`;
   if(!membership[0]){res.status(403).json({error:{code:'MEMBERSHIP_NOT_PROVISIONED'}});return}
   await sql`insert into external_identities(provider,subject,user_id,email) values('google',${subject},${userId},${email}) on conflict(provider,subject) do nothing`;
  }
  const memberships=await sql`select id,tenant_id from memberships where user_id=${userId} order by created_at asc,id asc limit 1`;
  if(!memberships[0]){res.status(403).json({error:{code:'MEMBERSHIP_NOT_PROVISIONED'}});return}
  const raw=randomBytes(32).toString('base64url'); const hash=createHash('sha256').update(raw).digest('hex'); const sessionId=randomUUID(); const expiresAt=new Date(Date.now()+sessionTtlMs);
  await sql`insert into sessions(id,user_id,token_hash,expires_at) values(${sessionId},${userId},${hash},${expiresAt})`;
  res.json({data:{token:raw,userId,tenantId:String(memberships[0].tenant_id),membershipId:String(memberships[0].id),expiresAt:expiresAt.toISOString()}});
 }catch(e){next(e)}
});

const byokMasterKey=process.env.FACTORY_BYOK_MASTER_KEY?.trim()??'';
function vaultKey(){if(!byokMasterKey)throw new Error('BYOK_VAULT_NOT_CONFIGURED');return createHash('sha256').update(byokMasterKey).digest()}
function encryptSecret(secret:string){const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',vaultKey(),iv);const encrypted=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);const tag=cipher.getAuthTag();return {ciphertext:encrypted.toString('base64'),iv:iv.toString('base64'),tag:tag.toString('base64')}}
async function ensureVaultTable(){if(!sql)return;await sql`create table if not exists factory_byok_vault (tenant_id text not null, credential_ref text not null, provider text not null, ciphertext text not null, iv text not null, tag text not null, updated_at timestamptz not null default now(), primary key(tenant_id,credential_ref))`}
app.put('/api/v1/factory/byok/:credentialRef',async(req,res,next)=>{try{const tenant=requireTenant(req,res);if(!tenant)return;if(!sql){res.status(503).json({error:{code:'BYOK_DATABASE_REQUIRED'}});return}const credentialRef=req.params.credentialRef.trim();const provider=typeof req.body?.provider==='string'?req.body.provider.trim():'';const secret=typeof req.body?.secret==='string'?req.body.secret.trim():'';if(!credentialRef||!provider||secret.length<8){res.status(400).json({error:{code:'INVALID_BYOK_CREDENTIAL'}});return}await ensureVaultTable();const enc=encryptSecret(secret);await sql`insert into factory_byok_vault(tenant_id,credential_ref,provider,ciphertext,iv,tag,updated_at) values(${tenant},${credentialRef},${provider},${enc.ciphertext},${enc.iv},${enc.tag},now()) on conflict(tenant_id,credential_ref) do update set provider=excluded.provider,ciphertext=excluded.ciphertext,iv=excluded.iv,tag=excluded.tag,updated_at=now()`;res.json({data:{credentialRef,provider,configured:true},meta:{source:'encrypted-vault'}})}catch(e){next(e)}});
app.get('/api/v1/factory/byok',async(req,res,next)=>{try{const tenant=requireTenant(req,res);if(!tenant)return;if(!sql){res.status(503).json({error:{code:'BYOK_DATABASE_REQUIRED'}});return}await ensureVaultTable();const rows=await sql`select credential_ref,provider,updated_at from factory_byok_vault where tenant_id=${tenant} order by updated_at desc`;res.json({data:rows.map(r=>({credentialRef:String(r.credential_ref),provider:String(r.provider),configured:true,updatedAt:new Date(r.updated_at as string).toISOString()})),meta:{source:'encrypted-vault'}})}catch(e){next(e)}});
app.delete('/api/v1/factory/byok/:credentialRef',async(req,res,next)=>{try{const tenant=requireTenant(req,res);if(!tenant)return;if(!sql){res.status(503).json({error:{code:'BYOK_DATABASE_REQUIRED'}});return}await ensureVaultTable();await sql`delete from factory_byok_vault where tenant_id=${tenant} and credential_ref=${req.params.credentialRef}`;res.status(204).send()}catch(e){next(e)}});
interface FactoryConfig {
 mode:'managed'|'custom';
 providers:Array<{id:string;name:string;kind:string;credentialRef?:string;baseUrl?:string;enabled:boolean}>;
 models:Array<{id:string;providerId:string;modelKey:string;displayName:string;capabilities:string[];enabled:boolean}>;
 agents:Array<{id:string;name:string;kind:'ogroup'|'external'|'custom'|'webhook'|'mcp';endpointRef?:string;enabled:boolean}>;
 roles:Array<{role:string;agentId:string;modelId?:string;fallbackModelId?:string;budgetLimitMicros?:number}>;
}
const factoryConfigs=new Map<string,FactoryConfig>();
function configFor(tenant:string):FactoryConfig {
 const existing=factoryConfigs.get(tenant); if(existing)return existing;
 const initial:FactoryConfig={mode:'managed',providers:[],models:[],agents:[],roles:[]}; factoryConfigs.set(tenant,initial); return initial;
}
async function ensureConfigTable(){
 if(!sql)return;
 await sql`create table if not exists factory_runtime_config (
  tenant_id text primary key,
  config_json text not null,
  updated_at timestamptz not null default now()
 )`;
}
async function loadConfig(tenant:string):Promise<FactoryConfig>{
 if(!sql)return configFor(tenant);
 await ensureConfigTable();
 const rows=await sql`select config_json from factory_runtime_config where tenant_id=${tenant}`;
 if(!rows[0])return {mode:'managed',providers:[],models:[],agents:[],roles:[]};
 return JSON.parse(String(rows[0].config_json)) as FactoryConfig;
}
async function persistConfig(tenant:string,input:FactoryConfig){
 if(!sql){factoryConfigs.set(tenant,input);return 'memory-fallback'}
 await ensureConfigTable(); const payload=JSON.stringify(input);
 await sql`insert into factory_runtime_config (tenant_id,config_json,updated_at) values (${tenant},${payload},now())
 on conflict (tenant_id) do update set config_json=excluded.config_json,updated_at=now()`;
 return 'postgres';
}
function configInput(body:unknown):FactoryConfig|null {
 if(!body||typeof body!=='object')return null; const v=body as Partial<FactoryConfig>;
 if(v.mode!=='managed'&&v.mode!=='custom')return null;
 return {mode:v.mode,providers:Array.isArray(v.providers)?v.providers:[],models:Array.isArray(v.models)?v.models:[],agents:Array.isArray(v.agents)?v.agents:[],roles:Array.isArray(v.roles)?v.roles:[]};
}

app.get('/api/v1/factory/config',async(req,res)=>{
 const tenant=requireTenant(req,res); if(!tenant)return;
 res.json({data:await loadConfig(tenant),meta:{source:sql?'postgres':'memory-fallback'}});
});

app.put('/api/v1/factory/config',async(req,res)=>{
 const tenant=requireTenant(req,res); if(!tenant)return;
 const input=configInput(req.body); if(!input){res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Invalid Factory configuration.'}});return}
 const providerIds=new Set(input.providers.map(x=>x.id)); const modelIds=new Set(input.models.map(x=>x.id)); const agentIds=new Set(input.agents.map(x=>x.id));
 if(input.models.some(x=>!providerIds.has(x.providerId))||input.roles.some(x=>!agentIds.has(x.agentId)||(x.modelId&&!modelIds.has(x.modelId))||(x.fallbackModelId&&!modelIds.has(x.fallbackModelId)))){
  res.status(400).json({error:{code:'FACTORY_CONFIG_REFERENCE_ERROR',message:'Role, model or provider reference is invalid.'}});return;
 }
 const source=await persistConfig(tenant,input); res.json({data:input,meta:{source}});
});

type UsageSource='ogroup'|'customer';
interface RuntimeUsageEvent { projectId?:string; source:UsageSource; provider?:string; model?:string; inputTokens:number; outputTokens:number; costMicros:number; occurredAt:string }
async function ensureUsageTable(){
 if(!sql)return;
 await sql`create table if not exists factory_runtime_usage (
  id bigserial primary key,
  tenant_id text not null,
  project_id text,
  source text not null check (source in ('ogroup','customer')),
  provider text,
  model text,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  cost_micros bigint not null default 0 check (cost_micros >= 0),
  occurred_at timestamptz not null default now()
 )`;
 await sql`create index if not exists factory_runtime_usage_tenant_time on factory_runtime_usage (tenant_id,occurred_at desc)`;
}
app.get('/api/v1/factory/usage',async(req,res,next)=>{
 try{
  const tenant=requireTenant(req,res);if(!tenant)return;
  if(!sql){res.status(503).json({error:{code:'USAGE_DATABASE_REQUIRED',message:'Usage persistence requires PostgreSQL.'}});return}
  await ensureUsageTable();
  const rows=await sql`select source,count(*)::int as events,coalesce(sum(input_tokens),0)::bigint as input_tokens,coalesce(sum(output_tokens),0)::bigint as output_tokens,coalesce(sum(cost_micros),0)::bigint as cost_micros from factory_runtime_usage where tenant_id=${tenant} group by source`;
  const empty=()=>({events:0,inputTokens:0,outputTokens:0,costMicros:0});
  const bySource:{ogroup:ReturnType<typeof empty>;customer:ReturnType<typeof empty>}={ogroup:empty(),customer:empty()};
  for(const row of rows){const source=row.source as UsageSource;bySource[source]={events:Number(row.events),inputTokens:Number(row.input_tokens),outputTokens:Number(row.output_tokens),costMicros:Number(row.cost_micros)}}
  const total={events:bySource.ogroup.events+bySource.customer.events,inputTokens:bySource.ogroup.inputTokens+bySource.customer.inputTokens,outputTokens:bySource.ogroup.outputTokens+bySource.customer.outputTokens,costMicros:bySource.ogroup.costMicros+bySource.customer.costMicros};
  res.json({data:{total,bySource},meta:{source:'postgres'}});
 }catch(e){next(e)}
});
app.post('/api/v1/factory/usage',async(req,res,next)=>{
 try{
  const tenant=requireTenant(req,res);if(!tenant)return;
  if(!sql){res.status(503).json({error:{code:'USAGE_DATABASE_REQUIRED'}});return}
  const body=req.body as Partial<RuntimeUsageEvent>; const source=body.source;
  const inputTokens=Number(body.inputTokens??0),outputTokens=Number(body.outputTokens??0),costMicros=Number(body.costMicros??0);
  if((source!=='ogroup'&&source!=='customer')||![inputTokens,outputTokens,costMicros].every(Number.isFinite)||[inputTokens,outputTokens,costMicros].some(x=>x<0)){res.status(400).json({error:{code:'INVALID_USAGE_EVENT'}});return}
  await ensureUsageTable();
  const occurredAt=body.occurredAt?new Date(body.occurredAt):new Date(); if(Number.isNaN(occurredAt.getTime())){res.status(400).json({error:{code:'INVALID_USAGE_TIME'}});return}
  await sql`insert into factory_runtime_usage (tenant_id,project_id,source,provider,model,input_tokens,output_tokens,cost_micros,occurred_at) values (${tenant},${body.projectId??null},${source},${body.provider??null},${body.model??null},${inputTokens},${outputTokens},${costMicros},${occurredAt})`;
  res.status(201).json({data:{recorded:true},meta:{source:'postgres'}});
 }catch(e){next(e)}
});

const BRAIN_SECTIONS=['requirements','business_rules','architecture','decisions','approved_designs','tasks','known_issues','testing_evidence','deployment_history'] as const;
type BrainSection=typeof BRAIN_SECTIONS[number];
interface BrainEntry { section:BrainSection; content:unknown; version:number; updatedAt:string }
const projectBrains=new Map<string,Map<string,BrainEntry>>();
function brainKey(tenant:string,runId:string){return `${tenant}:${runId}`}
async function ensureBrainTable(){
 if(!sql)return;
 await sql`create table if not exists factory_runtime_brain (
  tenant_id text not null,
  run_id text not null,
  section text not null,
  content_json text not null default 'null',
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, run_id, section)
 )`;
}
async function loadBrain(tenant:string,runId:string){
 if(!sql)return projectBrains.get(brainKey(tenant,runId));
 await ensureBrainTable();
 const rows=await sql`select section,content_json,version,updated_at from factory_runtime_brain where tenant_id=${tenant} and run_id=${runId}`;
 const brain=new Map<string,BrainEntry>();
 for(const row of rows) brain.set(String(row.section),{section:row.section as BrainSection,content:JSON.parse(String(row.content_json)),version:Number(row.version),updatedAt:new Date(row.updated_at as string).toISOString()});
 return brain;
}
async function persistBrain(tenant:string,runId:string,section:BrainSection,content:unknown){
 if(!sql)return null;
 await ensureBrainTable();
 const payload=JSON.stringify(content??null);
 const rows=await sql`insert into factory_runtime_brain (tenant_id,run_id,section,content_json,version,updated_at)
 values (${tenant},${runId},${section},${payload},1,now())
 on conflict (tenant_id,run_id,section) do update set content_json=excluded.content_json,version=factory_runtime_brain.version+1,updated_at=now()
 returning section,content_json,version,updated_at`;
 const row=rows[0]; if(!row) throw new Error('PROJECT_BRAIN_UPSERT_FAILED'); return {section:row.section as BrainSection,content:JSON.parse(String(row.content_json)),version:Number(row.version),updatedAt:new Date(row.updated_at as string).toISOString()} satisfies BrainEntry;
}
async function ownedRun(tenant:string,runId:string):Promise<Issue|null>{
 const match=runId.match(/factory-work:(\d+)/); if(!match)return null;
 const response=await github(`/issues/${match[1]}`); const issue=await response.json() as Issue;
 const issueTenant=issue.body?.match(/## Product owner tenant\s*\n+([^\n]+)/i)?.[1]?.trim();
 return issueTenant===tenant?issue:null;
}

app.get('/api/v1/factory/runs/:runId/brain',async(req,res,next)=>{
 try{const tenant=requireTenant(req,res);if(!tenant)return;const issue=await ownedRun(tenant,req.params.runId);if(!issue){res.status(404).json({error:{code:'RUN_NOT_FOUND'}});return}
 const brain=await loadBrain(tenant,req.params.runId);res.json({data:{runId:req.params.runId,sections:BRAIN_SECTIONS.map(section=>brain?.get(section)??{section,content:null,version:0,updatedAt:null})},meta:{source:'control-runtime'}})
 }catch(e){next(e)}
});
app.put('/api/v1/factory/runs/:runId/brain/:section',async(req,res,next)=>{
 try{const tenant=requireTenant(req,res);if(!tenant)return;const section=req.params.section as BrainSection;if(!BRAIN_SECTIONS.includes(section)){res.status(400).json({error:{code:'INVALID_BRAIN_SECTION'}});return}
 const issue=await ownedRun(tenant,req.params.runId);if(!issue){res.status(404).json({error:{code:'RUN_NOT_FOUND'}});return}
 const persisted=await persistBrain(tenant,req.params.runId,section,req.body?.content??null);if(persisted){res.json({data:persisted,meta:{source:'postgres'}});return} const key=brainKey(tenant,req.params.runId);const brain=projectBrains.get(key)??new Map<string,BrainEntry>();const current=brain.get(section);const entry:BrainEntry={section,content:req.body?.content??null,version:(current?.version??0)+1,updatedAt:new Date().toISOString()};brain.set(section,entry);projectBrains.set(key,brain);res.json({data:entry,meta:{source:'memory-fallback'}})
 }catch(e){next(e)}
});

app.get('/api/v1/factory/snapshot',async(req,res,next)=>{
 const tenant=requireTenant(req,res); if(!tenant)return;
 try{
  const [issuesResponse,runsResponse]=await Promise.all([
   github('/issues?state=open&labels=factory-work&per_page=100'),
   github('/actions/runs?per_page=30')
  ]);
  const issues=(await issuesResponse.json() as Issue[]).filter(x=>!x.pull_request && x.body?.match(/## Product owner tenant\s*\n+([^\n]+)/i)?.[1]?.trim()===tenant);
  const runs=(await runsResponse.json() as Runs).workflow_runs??[];
  const mapped=issues.map(issue=>{
   const labels=(issue.labels??[]).map(x=>x.name??'');
   const status=labels.find(x=>x.startsWith('factory-status:'))?.replace('factory-status:','').replace('-','_').toUpperCase()??'QUEUED';
   return {id:`factory-work:${issue.number}`,name:cleanName(issue.body?.match(/## Product intent\s*\n+([\s\S]*?)(?=\n## |$)/i)?.[1]||issue.title.replace(/^Factory product:\s*/i,'')),status,targetRepository:targetFromBody(issue.body),updatedAt:issue.updated_at};
  });
  const attention=mapped.filter(x=>x.status==='WAITING_HUMAN');
  res.json({data:{runs:mapped,activity:runs.slice(0,15).map(x=>({id:x.id,name:x.name,status:x.status,conclusion:x.conclusion,updatedAt:x.updated_at,url:x.html_url})),agents:[],health:{status:'HEALTHY',watchdog:'ACTIVE',source:'github'},attention},meta:{source:'live'}});
 }catch(e){next(e)}
});

app.post('/api/v1/factory/runs',async(req,res,next)=>{
 try{
  const tenant=requireTenant(req,res); if(!tenant)return;
  const intent=typeof req.body?.intent==='string'?req.body.intent.trim():'';
  if(intent.length<16){res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Product intent is too short.'}});return}
  const productName=cleanName(intent); const repoName=`factory-${safeTenantSlug(tenant)}-${slugify(productName)}`;
  let targetRepository=`alnatourm/${repoName}`;
  const repoCheck=await fetch(`https://api.github.com/repos/${targetRepository}`,{headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28'}});
  if(repoCheck.status===404){
    const created=await fetch('https://api.github.com/user/repos',{method:'POST',headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:JSON.stringify({name:repoName,description:`OGroup AI Factory product: ${productName}`,private:true,auto_init:true})});
    if(!created.ok) throw new Error(`GITHUB_${created.status}_CREATE_TARGET_REPOSITORY`);
    const repo=await created.json() as {full_name?:string}; targetRepository=repo.full_name||targetRepository;
  } else if(!repoCheck.ok) throw new Error(`GITHUB_${repoCheck.status}_CHECK_TARGET_REPOSITORY`);
  const body=`## Product intent\n\n${intent}\n\n## Target repository\n\`${targetRepository}\`\n\n## Product owner tenant\n${tenant}\n\n## Source\nProduct Owner Dashboard`;
  const response=await github('/issues',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:`Factory product: ${productName.slice(0,72)}`,body,labels:['factory-work']})});
  const issue=await response.json() as Issue;
  res.status(202).json({data:{runId:`factory-work:${issue.number}`,name:productName,targetRepository,status:'QUEUED'},meta:{}});
 }catch(e){next(e)}
});

app.get('/api/v1/factory/runs/:runId',async(req,res,next)=>{ try{ const tenant=requireTenant(req,res); if(!tenant)return; const match=req.params.runId.match(/factory-work:(\\d+)/); if(!match){res.status(400).json({error:{code:'VALIDATION_ERROR'}});return} const [ir,cr]=await Promise.all([github(`/issues/${match[1]}`),github(`/issues/${match[1]}/comments?per_page=100`)]); const issue=await ir.json() as Issue; const issueTenant=issue.body?.match(/## Product owner tenant\\s*\\n+([^\\n]+)/i)?.[1]?.trim(); if(issueTenant!==tenant){res.status(404).json({error:{code:'RUN_NOT_FOUND'}});return} const comments=await cr.json() as Comment[]; res.json({data:{id:req.params.runId,name:cleanName(issue.body?.match(/## Product intent\\s*\\n+([\\s\\S]*?)(?=\\n## |$)/i)?.[1]||issue.title),intent:issue.body?.match(/## Product intent\\s*\\n+([\\s\\S]*?)(?=\\n## |$)/i)?.[1]?.trim()||'',targetRepository:targetFromBody(issue.body),status:statusOf(issue),updatedAt:issue.updated_at,activity:comments.map(c=>({id:c.id,text:c.body||'',at:c.created_at,actor:c.user?.login||'factory'}))},meta:{source:'live'}}); }catch(e){next(e)} });

app.post('/api/v1/factory/runs/:runId/gates/:gate/:decision',async(req,res,next)=>{
 try{
  const tenant=requireTenant(req,res); if(!tenant)return;
  const match=req.params.runId.match(/factory-work:(\d+)/); const gate=req.params.gate; const decision=req.params.decision;
  if(!match||!['design','production'].includes(gate)||!['approve','changes'].includes(decision)){res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Invalid Factory gate command.'}});return}
  const issueResponse=await github(`/issues/${match[1]}`); const issue=await issueResponse.json() as Issue; const issueTenant=issue.body?.match(/## Product owner tenant\\s*\\n+([^\\n]+)/i)?.[1]?.trim(); if(issueTenant!==tenant){res.status(404).json({error:{code:'RUN_NOT_FOUND'}});return}
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
