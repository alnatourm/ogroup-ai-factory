/* global process, fetch, console */
import { execFileSync } from 'node:child_process';

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
const response=await fetch(`${url}/internal/v1/factory/runs/${encodeURIComponent(runId)}/evidence`,{
  method:'POST',
  headers:{'content-type':'application/json','x-factory-control-key':token},
  body:JSON.stringify({tenant,kind,evidence:{status:'verified',repository,workflowRun:process.env.GITHUB_RUN_ID??null,commit,stack,checks,url:process.env.DEPLOYMENT_URL??null,provider:process.env.DEPLOYMENT_PROVIDER??null}})
});
if(!response.ok) throw new Error(`FACTORY_EVIDENCE_HTTP_${response.status}: ${(await response.text()).slice(0,300)}`);
console.log(JSON.stringify({type:'FACTORY_CUSTOMER_EVIDENCE_RECORDED',kind,runId,repository,commit}));
