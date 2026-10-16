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

test('marketing banner is unchecked by default and stays dismissed after decline or withdrawal',async()=>{
  for(const consent of [null,{subscribed:false},{subscribed:true}]) {
    let lookup;
    const {MarketingPreferences}=await load('components/MarketingPreferences.tsx',{
      ...common,'@/lib/db':{db:()=>({account:{findUnique:async query=>{lookup=query.where;return {status:'ACTIVE',emailVerifiedAt:new Date(),marketingConsent:consent};}}})},
    });
    const output=await MarketingPreferences({accountId:'authenticated-owner',banner:true});
    assert.equal(lookup.id,'authenticated-owner');
    if(consent){assert.equal(output,null);continue;}
    const html=renderToStaticMarkup(output);
    assert.match(html,/type="checkbox"/);assert.doesNotMatch(html,/checked=""/);
    assert.match(html,/Leave this unchecked and save to decline/);
    assert.ok(html.includes(`name="version" value="${policy.consentVersion}"`));
    assert.match(html,/weekly blog digest/);
  }
});

test('unverified users can view Settings but cannot opt in through its checkbox',async()=>{
  const {MarketingPreferences}=await load('components/MarketingPreferences.tsx',{
    ...common,'@/lib/db':{db:()=>({account:{findUnique:async()=>({status:'PENDING',emailVerifiedAt:null,marketingConsent:null})}})},
  });
  const html=renderToStaticMarkup(await MarketingPreferences({accountId:'owner'}));
  assert.match(html,/disabled=""/);assert.match(html,/Verify your email to subscribe/);
  assert.equal(await MarketingPreferences({accountId:'owner',banner:true}),null);
});

test('consent mutation ignores a forged account ID and runs CAPTCHA before any write',async()=>{
  let saved,blocked=false;
  const {saveMarketingConsent}=await load('app/marketing-actions.ts',{
    'next/navigation':{unstable_rethrow(){}},'next/cache':{revalidatePath(){}},
    '@/lib/auth':{requireAccount:async()=>({id:'real-owner',emailVerifiedAt:new Date()}),rateLimit:async()=>{}},
    '@/lib/db':{db:()=>({})},'@/lib/captcha.mjs':{verifyCaptcha:async()=>{if(blocked)throw Error('rejected');}},
    '@/lib/marketing-policy.mjs':{...policy,marketingEnabled:()=>true},
    '@/lib/marketing-store.mjs':{saveConsent:async(client,id,subscribed,source)=>{saved={id,subscribed,source};},syncAccountConsent:async()=> 'synced'},
  });
  const data=new FormData();data.set('accountId','victim');data.set('subscribe','on');data.set('version',policy.consentVersion);
  assert.ok((await saveMarketingConsent({},data)).success);
  assert.equal(saved.id,'real-owner');assert.equal(saved.subscribed,true);
  blocked=true;saved=null;
  assert.ok((await saveMarketingConsent({},data)).error);assert.equal(saved,null);
});

test('administrator campaign actions reject a personal session before any database/provider call',async()=>{
  let touched=false;
  const actions=await load('app/admin/email/actions.ts',{
    'next/navigation':{unstable_rethrow(error){if(error?.message==='ADMIN_REQUIRED')throw error;}},'next/cache':{revalidatePath(){}},
    '@/lib/admin-auth':{requireAdministrator:async()=>{throw Error('ADMIN_REQUIRED');}},
    '@/lib/auth':{rateLimit:async()=>{touched=true;}},'@/lib/db':{db:()=>{touched=true;}},
    '@/lib/captcha.mjs':{verifyCaptcha:async()=>{touched=true;}},'@/lib/security.mjs':{InputError:class extends Error{}},
    '@/lib/marketing-policy.mjs':policy,'@/lib/marketing-store.mjs':{submitCampaign:async()=>{touched=true;}},
    '@/lib/brevo.mjs':{assertSender:async()=>{touched=true;},sendBrevoMail:async()=>{touched=true;}},
  });
  for(const action of [actions.createMarketingDraft,actions.testMarketingDraft,actions.sendMarketingDraft])await assert.rejects(action({},new FormData()),/ADMIN_REQUIRED/);
  assert.equal(touched,false);
});
