import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as crypto from 'node:crypto';
import * as policy from '../lib/export-policy.mjs';
import * as csv from '../lib/plan-policy.mjs';

async function load(database){
  const exports={};
  const dependencies={'server-only':{},'node:crypto':crypto,'./db':{db:()=>database},'./export-policy.mjs':policy,'./plan-policy.mjs':csv,'./form-policy.mjs':{parseQuestions:x=>x}};
  const source=ts.transpileModule(await readFile('lib/export-data.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source,{exports,Buffer,Date,Intl,require:name=>{assert.ok(name in dependencies,name);return dependencies[name];}});
  return exports;
}
test('a 10,001-message export is complete, ordered and owner-scoped without manual batching',async()=>{
  const items=Array.from({length:10001},(_,i)=>({id:String(i+1).padStart(8,'0'),createdAt:new Date('2026-10-01T12:00:00Z'),updatedAt:new Date('2026-10-01T12:00:00Z'),publicBody:i===0?'=HYPERLINK("https://example.com")':`Response ${i}`,body:'PRIVATE ORIGINAL',questionId:null,question:null}));
  let calls=0;
  const api=await load({submission:{findMany:async({where,take,orderBy})=>{
    calls++;assert.equal(take,100);assert.equal(orderBy.id,'asc');assert.equal(where.AND[0].accountId,'owner');assert.equal(where.AND[0].sharingPolicy,'OWNER_MAY_SHARE');
    const cursor=where.AND[1]?.id.gt||'';return items.filter(i=>i.id>cursor).slice(0,take);
  }}});
  const filters=policy.parseExportFilters({source:'messages',from:'2026-10-01',to:'2026-10-09',columns:['recordId','response']});
  const result=await api.collectExport('owner',filters,new Date('2026-10-10'));
  assert.equal(result.records,10001);assert.equal(result.rows,10001);assert.equal(calls,102);
  const output=result.bytes.toString('utf8');assert.ok(output.includes('00010001'));assert.ok(!output.includes('PRIVATE ORIGINAL'));assert.ok(output.includes("'="));
  assert.equal(output.split('\r\n').length,10003);
});
test('private analysis exports legacy messages with no consent record',async()=>{
  let called=false;
  const api=await load({submission:{findMany:async({where})=>{
    const scope=where.AND[0];
    assert.equal(scope.accountId,'owner');
    assert.equal(scope.exportPermission,undefined);
    assert.equal(scope.sharingPolicy,undefined);
    assert.equal(scope.status.not,'SPAM');
    if(called)return [];called=true;
    return [{id:'legacy1',createdAt:new Date('2026-10-01'),updatedAt:new Date('2026-10-01'),publicBody:null,body:'Legacy private answer',questionId:null,question:null}];
  }}});
  const result=await api.collectExport('owner',policy.parseExportFilters({source:'messages',purpose:'ANALYSIS',from:'2026-10-01',to:'2026-10-09'}),new Date('2026-10-10'));
  assert.equal(result.records,1);
  assert.ok(result.bytes.toString().includes('Legacy private answer'));
});
test('wide form exports keep all answers from each completed submission in one row',async()=>{
  const questions=[{id:'q1',label:'First'},{id:'q2',label:'Second'}];let called=false;
  const api=await load({feedbackForm:{findFirst:async()=>({questions})},feedbackEntry:{findMany:async({where})=>{
    assert.equal(where.AND[0].form.accountId,'owner');assert.equal(where.AND[0].shareAllowed,true);
    if(called)return [];called=true;return [{id:'entry1',createdAt:new Date('2026-10-01'),form:{id:'form1',title:'Course feedback'},answers:[{id:'a1',questionId:'q1',textValue:'Two\nlines',numberValue:null}]}];
  }}});
  const result=await api.collectExport('owner',policy.parseExportFilters({source:'forms',sourceId:'form1',layout:'WIDE',from:'2026-10-01',to:'2026-10-09'}),new Date('2026-10-10'));
  assert.equal(result.records,1);assert.equal(result.rows,1);assert.ok(result.bytes.toString().includes('First [q1]'));assert.ok(result.bytes.toString().includes('Two\nlines'));
});
