import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import * as policy from '../lib/marketing-policy.mjs';

async function load(file,modules) {
  const exports={};
  const code=ts.transpileModule(await readFile(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code,{exports,Date,process:{env:{UNSAIDBOX_MARKETING_ENABLED:'true'}},require:name=>{
    if(name==='react/jsx-runtime')return jsx;
    if(!(name in modules))throw Error('Unexpected import '+name);
    return modules[name];
  }});
  return exports;
}
const form={ActionForm:({children,label})=>jsx.jsxs('form',{children:[children,jsx.jsx('button',{children:label})]})};
const {Checkbox}=await load('components/ui/Checkbox.tsx',{});
const common={
  'next/link':{default:({href,children})=>jsx.jsx('a',{href,children})},
  './ActionForm':form,'./ui/Checkbox':{Checkbox},
  '@/app/marketing-actions':{saveMarketingConsent(){}},
  '@/lib/marketing-policy.mjs':{...policy,marketingEnabled:()=>true},
  '@/lib/lead-policy.mjs':{leadEnabled:()=>false},
};


const {writeFile}=await import('node:fs/promises');
const {MarketingPreferences}=await load('components/MarketingPreferences.tsx',{...common,'./ActionForm':{ActionForm:({children,label})=>jsx.jsxs('form',{className:'app-form',children:[jsx.jsx('fieldset',{children}),jsx.jsx('button',{className:'button',children:label})]})},'@/lib/db':{db:()=>({account:{findUnique:async()=>({status:'ACTIVE',emailVerifiedAt:new Date(),marketingConsent:null})}})}});
const markup=renderToStaticMarkup(await MarketingPreferences({accountId:'preview-only',banner:true}));
const css=(await readFile('app/globals.css','utf8'))+'\n'+(await readFile('app/workspace.css','utf8'));
await writeFile('docs/email/dashboard-digest-preview.html',`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div class="workspace" style="display:block;padding:40px;min-height:100vh"><main class="workspace-main" style="max-width:1100px;margin:auto;padding:0">${markup}<h1>Your workspace</h1><p>Your questions and feedback, all in one place.</p></main></div></body></html>`);
