/* global process, fetch, console */
import { execFileSync } from 'node:child_process';
import { createHmac, createHash } from 'node:crypto';

const url=process.env.FACTORY_CONTROL_API_URL?.replace(/\/$/,'');
const token=process.env.FACTORY_CALLBACK_TOKEN;
const tenant=process.env.TENANT_ID;
const runId=process.env.RUN_ID;
const repository=process.env.TARGET_REPOSITORY;
if(!url||!token||!tenant||!runId||!repository) throw new Error('FACTORY_EVIDENCE_CONTEXT_REQUIRED');
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const kind=process.env.EVIDENCE_KIND==='deployment'?'deployment':'testing';
const stack=process.env.VERIFIED_STACK??'unknown';
const checks=(process.env.VERIFIED_CHECKS??'').split(',').map((value)=>value.trim()).filter(Boolean);
const body=JSON.stringify({tenant,kind,evidence:{status:'verified',repository,workflowRun:process.env.GITHUB_RUN_ID??null,commit,stack,checks,url:process.env.DEPLOYMENT_URL??null,provider:process.env.DEPLOYMENT_PROVIDER??null}});
const timestamp=String(Math.floor(Date.now()/1000));
const path=`/internal/v1/factory/runs/${encodeURIComponent(runId)}/evidence`;
const digest=createHash('sha256').update(body).digest('hex');
const signature=createHmac('sha256',token).update(`evidence:${timestamp}:POST:${path}:${digest}`).digest('hex');
const response=await fetch(`${url}${path}`,{
  method:'POST',
  headers:{'content-type':'application/json','x-factory-callback-scope':'evidence','x-factory-callback-timestamp':timestamp,'x-factory-callback-signature':signature},
  body
});
if(!response.ok) throw new Error(`FACTORY_EVIDENCE_HTTP_${response.status}: ${(await response.text()).slice(0,300)}`);
console.log(JSON.stringify({type:'FACTORY_CUSTOMER_EVIDENCE_RECORDED',kind,runId,repository,commit}));
