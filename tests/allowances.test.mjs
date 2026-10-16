import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { plans } from '../lib/plan-policy.mjs';
import * as allowance from '../lib/allowance-policy.mjs';
import { taxRevision } from '../lib/billing-policy.mjs';
import { InputError } from '../lib/security.mjs';

function form(overrides = {}) {
  const f = new FormData();
  for (const tier of ['free','pro']) for (const {key} of allowance.allowanceFields) f.set(`${tier}.${key}`,String(plans[tier][key]));
  f.set('revision','0'); f.set('confirmImpact','on');
  for (const [key,value] of Object.entries(overrides)) f.set(key,value);
  return f;
}
async function load(file, modules) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(await readFile(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:name=>modules[name]});
  return exports;
}
test('allowance input is bounded, integer-only, complete and preserves feature gates',()=>{
  assert.equal(allowance.parseAllowances(form()) .free.submissions,500);
  for(const v of ['','0','-1','2.5','1e3','Infinity','1000001']) assert.throws(()=>allowance.parseAllowances(form({'free.submissions':v})),InputError);
  assert.throws(()=>allowance.parseAllowances(form({'free.questions':'26'})),/cannot be less/);
  assert.throws(()=>allowance.validateAllowances({free:{},pro:{}}),InputError);
  const result=allowance.validateAllowances({free:{...plans.free,branding:true},pro:{...plans.pro,csv:false}});
  assert.equal(result.free.branding,false); assert.equal(result.pro.csv,true);
});
test('configuration uses defaults only for absent row, not corrupt values or database errors',async()=>{
  let row=null;
  const client={billingConfiguration:{findUnique:async()=>row}};
  const api=await load('lib/plan-configuration.ts',{'server-only':{},'./db':{db:()=>client},'./plan-policy.mjs':{plans},'./allowance-policy.mjs':allowance});
  assert.equal((await api.getPlanConfiguration()).revision,0);
  row={revision:2,prices:{free:{...plans.free,submissions:700},pro:plans.pro}};
  assert.equal((await api.getPlanConfiguration()).plans.free.submissions,700);
  row.prices={}; await assert.rejects(api.getPlanConfiguration(),InputError);
  client.billingConfiguration.findUnique=async()=>{throw Error('offline');};
  await assert.rejects(api.getPlanConfiguration(),/offline/);
});
async function fixture({auth=true,captcha=true,auditFails=false}={}){
  const state={row:null,audits:[],writes:0};
  const modules={
    'next/navigation':{unstable_rethrow:e=>{if(e.message==='redirect')throw e;}},'next/cache':{revalidatePath(){}},
    '@/lib/admin-auth':{requireAdministrator:async()=>{if(!auth)throw Error('redirect');return{id:'admin'};}},
    '@/lib/captcha.mjs':{verifyCaptcha:async(_,action)=>{assert.equal(action,'savePlanAllowances');if(!captcha)throw new InputError('CAPTCHA');}},
    '@/lib/auth':{rateLimit:async()=>{}},'@/lib/security.mjs':{InputError},'@/lib/billing-policy.mjs':{taxRevision},'@/lib/allowance-policy.mjs':allowance,
    '@/lib/db':{db:()=>({$transaction:async callback=>{
      const before=structuredClone(state);
      try {return await callback({billingConfiguration:{
        create:async({data})=>{if(state.row)throw Error('duplicate');state.row=data;state.writes++;},
        updateMany:async({where,data})=>{if(where.id!=='allowances'||where.revision!==state.row?.revision)return{count:0};state.row={...state.row,...data,revision:state.row.revision+1};state.writes++;return{count:1};},
      },auditEvent:{create:async({data})=>{if(auditFails)throw Error('audit');state.audits.push(data);}}});}
      catch(e){Object.assign(state,before);throw e;}
    }})},
  };
  const api=await load('app/admin/billing/allowance-actions.ts',modules);
  return {state,save:f=>api.savePlanAllowances({},f)};
}
test('saving allowances requires administrator, CAPTCHA and impact confirmation',async()=>{
  const denied=await fixture({auth:false});await assert.rejects(denied.save(form()),/redirect/);assert.equal(denied.state.writes,0);
  const bot=await fixture({captcha:false});assert.equal((await bot.save(form())).error,'CAPTCHA');assert.equal(bot.state.writes,0);
  const f=await fixture();assert.ok((await f.save(form({confirmImpact:''}))).error);assert.equal(f.state.writes,0);
});
test('allowances have independent revisions, reject stale saves and audit atomically',async()=>{
  const f=await fixture();assert.ok((await f.save(form())).success);assert.equal(f.state.row.id,'allowances');assert.equal(f.state.row.updatedBy,'admin');
  assert.ok((await f.save(form())).error);assert.equal(f.state.writes,1);
  assert.ok((await f.save(form({revision:'1','free.submissions':'600'}))).success);
  assert.equal(f.state.row.prices.free.submissions,600);assert.equal(f.state.row.revision,2);assert.equal(f.state.audits.length,2);
  const broken=await fixture({auditFails:true});assert.ok((await broken.save(form())).error);assert.equal(broken.state.row,null);
});
