import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import * as policy from '../lib/export-policy.mjs';
import * as integrity from '../lib/export-integrity.mjs';

async function fixture({owned=true,pro=true,changed=false,revoked=false,corrupt=false}={}){
  const state={reads:0,revoked:false,counted:0};
  const text='response\r\nTest\r\n';
  const job={storageKey:'key',filters:{source:'messages'},checkpoint:{fingerprint:'original'},fileBytes:Buffer.byteLength(text),checksumSha256:createHash('sha256').update(text).digest('hex'),fileName:'test.csv'};
  const modules={
    '@/lib/auth':{requireAccount:async()=>({id:'owner'}),rateLimit:async()=>{}},
    '@/lib/plans':{requirePlanFeature:async()=>{if(!pro)throw Error('not pro');}},
    '@/lib/plan-policy.mjs':{planMode:()=> 'test'},
    '@/lib/db':{db:()=>({exportJob:{
      findFirst:async({where})=>{assert.equal(where.accountId,'owner');assert.equal(where.revokedAt,null);assert.equal(where.policyVersion,'sharing-v1:test');return owned?job:null;},
      count:async({where})=>{assert.equal(where.accountId,'owner');assert.equal(where.account.status,'ACTIVE');return revoked?0:1;},
      updateMany:async({where,data})=>{assert.equal(where.accountId,'owner');if(data.status==='REVOKED')state.revoked=true;if(data.downloadCount)state.counted++;return {count:1};},
    }})},
    '@/lib/export-data':{collectExport:async(owner,filters,snapshot,content)=>{assert.equal(owner,'owner');assert.equal(content,false);return {fingerprint:changed?'changed':'original'};}},
    '@/lib/export-policy.mjs':policy,
    '@/lib/export-integrity.mjs':integrity,
    '@/lib/export-storage':{readExport:async()=>{state.reads++;return new Response(corrupt?'wrong':text);}},
    'next/navigation':{unstable_rethrow:()=>{}},
  };
  const exports={};
  vm.runInNewContext(ts.transpileModule(await readFile('app/api/exports/[id]/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,Response,Uint8Array,console:{warn(){}},require:name=>{assert.ok(name in modules,name);return modules[name];}});
  return {state,get:()=>exports.GET(new Request('https://example.test/api/exports/id'),{params:Promise.resolve({id:'id'})})};
}
test('download blocks other owners and Free access before reading storage',async()=>{
  for(const options of [{owned:false},{pro:false}]){const f=await fixture(options);assert.notEqual((await f.get()).status,200);assert.equal(f.state.reads,0);}
});
test('permission changes revoke the old file rather than serving stale private data',async()=>{
  const f=await fixture({changed:true});assert.equal((await f.get()).status,409);assert.equal(f.state.reads,0);assert.equal(f.state.revoked,true);
});
test('revocation during validation and corrupt provider bytes prevent downloads',async()=>{
  for(const options of [{revoked:true},{corrupt:true}]){const f=await fixture(options);assert.notEqual((await f.get()).status,200);assert.equal(f.state.counted,0);}
});
test('verified downloads are private, no-store and served as attachments',async()=>{
  const f=await fixture();const r=await f.get();assert.equal(r.status,200);assert.equal(await r.text(),'response\r\nTest\r\n');assert.match(r.headers.get('cache-control'),/no-store/);assert.match(r.headers.get('content-disposition'),/attachment/);assert.equal(f.state.counted,1);
});
