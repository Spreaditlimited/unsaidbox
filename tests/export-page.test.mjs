import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import * as policy from '../lib/export-policy.mjs';

async function render({params={},eligible=3,jobs=[]}={}) {
  const exports={};
  const own=async ({where})=>{assert.equal(where.accountId,'owner');return [];};
  const modules={
    'react/jsx-runtime':jsx,
    'next/link':{default:({children,...props})=>jsx.jsx('a',{...props,children})},
    '@/lib/auth':{requireAccount:async()=>({id:'owner',displayName:'Example'})},
    '@/lib/plans':{accountPlan:async()=>({enforced:true,limits:{csv:true}})},
    '@/lib/db':{db:()=>({exportPreset:{findMany:own},question:{findMany:own},feedbackForm:{findMany:own},exportJob:{findMany:async({where})=>{assert.equal(where.accountId,'owner');return jobs;}}})},
    '@/components/DashboardShell':{DashboardShell:({children})=>jsx.jsx('main',{children})},
    '@/components/ActionForm':{ActionForm:({children,label,captchaAction})=>jsx.jsxs('form',{'data-action':captchaAction,children:[children,jsx.jsx('button',{children:label})]})},
    '@/components/ui/Checkbox':{Checkbox:({children,...props})=>jsx.jsxs('label',{children:[jsx.jsx('input',{...props,type:'checkbox'}),children]})},
    '@/components/ui/Picker':{Picker:({name,label,defaultValue})=>jsx.jsxs('label',{children:[label,jsx.jsx('input',{name,value:defaultValue,readOnly:true})]})},
    '@/components/ui/DatePicker':{DatePicker:({name,label,defaultValue})=>jsx.jsxs('label',{children:[label,jsx.jsx('input',{name,value:defaultValue,readOnly:true})]})},
    '@/lib/export-policy.mjs':policy,
    '@/lib/export-data':{exportCounts:async(owner)=>{assert.equal(owner,'owner');return {matchingRecords:5,eligibleRecords:eligible,excludedRecords:5-eligible};}},
    './actions':{createExport(){},retryExport(){},revokeExport(){},saveExportPreset(){},deleteExportPreset(){}},
    './exports.module.css':{default:new Proxy({},{get:(_,key)=>String(key)})},
    '@/components/forms/ReviewFilters':{ReviewFilters:()=>jsx.jsx('span',{children:'Review controls'})},
    '@/components/ExportProgress':{ExportProgress:()=>null},
  };
  const source=ts.transpileModule(await readFile('app/dashboard/exports/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(source,{exports,Date,Intl,require:name=>{assert.ok(name in modules,name);return modules[name];}});
  return renderToStaticMarkup(await exports.default({searchParams:Promise.resolve(params)}));
}

test('export centre renders labelled steps and preserves authenticated export fields',async()=>{
  const html=await render();
  assert.match(html,/Choose your responses/);
  assert.match(html,/Make the file yours/);
  assert.match(html,/name="purpose"[^>]*value="ANALYSIS"/);
  assert.match(html,/data-action="createExport"/);
  assert.match(html,/Submission ID/);
  assert.match(html,/Your first download starts above/);
  assert.doesNotMatch(html,/type="date"|<select/);
});
test('zero eligible records show guidance instead of an empty download action',async()=>{
  const html=await render({eligible:0});
  assert.match(html,/No responses to export yet/);
  assert.doesNotMatch(html,/data-action="createExport"/);
});
test('wide forms retain their layout and use automatic columns',async()=>{
  const html=await render({params:{source:'forms',sourceId:'form1',layout:'WIDE'}});
  assert.match(html,/name="layout"[^>]*value="WIDE"/);
  assert.match(html,/all form questions are included automatically/);
  assert.match(html,/Review controls/);
});
test('download history distinguishes ready, expired and revoked files',async()=>{
  const base={createdAt:new Date(),processedRecords:3,outputRows:3,attempts:1,fileName:'test.csv',lastErrorCode:null};
  const html=await render({jobs:[
    {...base,id:'ready',status:'READY',expiresAt:new Date(Date.now()+86400000)},
    {...base,id:'expired',status:'READY',expiresAt:new Date(0)},
    {...base,id:'revoked',status:'REVOKED',expiresAt:new Date(0)},
  ]});
  assert.match(html,/href="\/api\/exports\/ready"/);
  assert.doesNotMatch(html,/href="\/api\/exports\/(expired|revoked)"/);
  assert.match(html,/Access revoked/);
  assert.match(html,/Expired/);
});
