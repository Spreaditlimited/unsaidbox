import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as crypto from 'node:crypto';
import * as policy from '../lib/export-policy.mjs';
function matches(row,where){
  return Object.entries(where).every(([key,value])=>{
    if(key==='OR')return value.some(v=>matches(row,v));
    if(value&&typeof value==='object'&&!(value instanceof Date))return Object.entries(value).every(([op,v])=>op==='lt'?row[key]<v:op==='gt'?row[key]>v:op==='not'?row[key]!==v:false);
    return row[key]===value;
  });
}
function apply(row,data){for(const [key,value] of Object.entries(data))row[key]=value&&typeof value==='object'&&'increment'in value?row[key]+value.increment:value;}
async function fixture({busy=false,revoked=false,uploadFails=false,expireLease=false}={}){
  const state={uploads:0,deletes:0,lease:{key:'',count:0,expiresAt:busy?new Date(Date.now()+300000):new Date(0)},job:{id:'job',accountId:'owner',status:'QUEUED',revokedAt:revoked?new Date():null,expiresAt:new Date(Date.now()+86400000),attempts:0,policyVersion:'sharing-v1:test',filters:{source:'messages'},snapshotAt:new Date(),storageKey:null,lockToken:null,lockedUntil:null}};
  const db={
    rateLimit:{upsert:async({where})=>{state.lease.key=where.key;},updateMany:async({where,data})=>{if(!matches(state.lease,where))return{count:0};apply(state.lease,data);return{count:1};}},
    exportJob:{updateMany:async({where,data})=>{if(!matches(state.job,where))return{count:0};apply(state.job,data);return{count:1};},findFirstOrThrow:async({where})=>{assert.ok(matches(state.job,where));return structuredClone(state.job);},update:async({where,data})=>{assert.equal(where.id,'job');apply(state.job,data);}},
    account:{findUnique:async({where})=>{assert.equal(where.id,'owner');return{status:'ACTIVE'};}},
  };
  const modules={
    'server-only':{},'node:crypto':crypto,'next/server':{after:()=>{}},'./db':{db:()=>db},
    './plans':{requirePlanFeature:async(owner,feature)=>{assert.equal(owner,'owner');assert.equal(feature,'csv');}},
    './plan-policy.mjs':{planMode:()=> 'test'},'./export-policy.mjs':policy,
    './export-data':{exportCounts:async()=>({matchingRecords:1,eligibleRecords:1,excludedRecords:0}),collectExport:async(owner,filters,snapshot,content,heartbeat)=>{assert.equal(owner,'owner');if(expireLease)state.lease.expiresAt=new Date(0);await heartbeat(1);return{bytes:Buffer.from('response\r\nExample\r\n'),fingerprint:'fingerprint',records:1,rows:1};}},
    './export-storage':{storeExport:async()=>{state.uploads++;if(uploadFails)throw Error('EXPORT_STORAGE_FAILED');},removeExport:async()=>{state.deletes++;}},
  };
  const exports={};
  vm.runInNewContext(ts.transpileModule(await readFile('lib/export-jobs.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,Buffer,console:{warn(){}},require:name=>{assert.ok(name in modules,name);return modules[name];}});
  return{state,run:(owner='owner')=>exports.processExport('job',owner)};
}
test('worker claims, prepares, checksums and completes exactly once',async()=>{
  const f=await fixture();await f.run();assert.equal(f.state.job.status,'READY');assert.equal(f.state.job.outputRows,1);assert.match(f.state.job.checksumSha256,/^[a-f0-9]{64}$/);assert.equal(f.state.job.lockToken,null);await f.run();assert.equal(f.state.uploads,1);
});
test('capacity, ownership and revocation prevent preparation',async()=>{
  for(const options of [{busy:true},{revoked:true},{}]){const f=await fixture(options);await f.run(Object.keys(options).length?'owner':'other-owner');assert.equal(f.state.uploads,0);}
});
test('lost global lease fails before upload and cannot publish a result',async()=>{
  const f=await fixture({expireLease:true});await f.run();assert.equal(f.state.job.status,'FAILED');assert.equal(f.state.job.lastErrorCode,'EXPORT_LEASE_LOST');assert.equal(f.state.uploads,0);
});
test('provider failure cleans the attempted file and bounds attempts',async()=>{
  const f=await fixture({uploadFails:true});for(let i=0;i<4;i++)await f.run();assert.equal(f.state.job.status,'FAILED');assert.equal(f.state.job.attempts,3);assert.equal(f.state.uploads,3);assert.ok(f.state.deletes>=3);
});
