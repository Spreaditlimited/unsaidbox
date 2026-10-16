import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { leadEnabled,leadPopupPath,validateLead } from '../lib/lead-policy.mjs';
import { consentVersion } from '../lib/marketing-consent.mjs';
import { requestLead,confirmLead } from '../lib/lead-store.mjs';
import { reconcileAudience } from '../lib/marketing-store.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');

function fixture() {
  let lead=null,owner=null,consent=null,lock=Promise.resolve();const events=[];
  const client={
    marketingControl:{update:async()=>{}},
    marketingLead:{
      upsert:async({create})=>lead??(lead={id:'lead-fixture',subscribed:false,confirmedAt:null,...create}),
      update:async({data})=>Object.assign(lead,data),
      findUnique:async({where})=>lead&&(where.email===lead.email||(where.tokenHash&&where.tokenHash===lead.tokenHash))?lead:null,
      findUniqueOrThrow:async()=>lead,
      findMany:async()=>lead?[lead]:[],
    },
    marketingLeadEvent:{create:async({data})=>events.push(data)},
    account:{findUnique:async()=>owner?{...owner,marketingConsent:consent}:null},
    marketingConsent:{upsert:async({create})=>{consent=create;},findMany:async()=>[]},
    marketingConsentEvent:{create:async()=>{}},
    $transaction:async work=>{
      const prior=lock;let release;lock=new Promise(resolve=>{release=resolve;});
      await prior;try{return await work(client);}finally{release();}
    },
  };
  return {client,events,get lead(){return lead;},set owner(value){owner=value;},get consent(){return consent;},set consent(value){consent=value;}};
}

test('lead capture has a strict public-page allowlist and excludes private routes and analytics',async()=>{
  for(const path of ['/','/pricing','/templates','/blog','/blog/asking-better-questions'])assert.equal(leadPopupPath(path),true,path);
  for(const path of ['/u/alice','/u/alice/ask','/q/private-id','/f/private-id','/follow-up/token','/dashboard','/admin','/login','/start','/safety','/cookies','/contact','/updates/confirm','/blog/feed','/blog/media'])assert.equal(leadPopupPath(path),false,path);
  const {analyticsPage}=await import('../lib/analytics-policy.mjs');
  assert.equal(analyticsPage('/updates/confirm'),null);
  assert.equal(leadEnabled({}),false);
  assert.equal(leadEnabled({UNSAIDBOX_EMAIL_LEADS_ENABLED:'true',UNSAIDBOX_MARKETING_ENABLED:'true'}),true);
});

test('lead validation requires explicit consent and current wording, and bounds header/input data',()=>{
  const value={name:' Ada ',email:'ADA@EXAMPLE.INVALID',consent:true,version:consentVersion};
  assert.deepEqual(validateLead(value,consentVersion),{name:'Ada',email:'ada@example.invalid'});
  for(const extra of [{consent:false},{version:'old'},{name:'Bad\nHeader'},{email:'a@example.invalid\nBcc:other@example.invalid'},{name:'<script>'},{email:'x'.repeat(255)}])assert.throws(()=>validateLead({...value,...extra},consentVersion));
});

test('concurrent requests send one confirmation; store only a token hash and no subscription',async()=>{
  const f=fixture();let sent=[];const input={name:'Ada',email:'ada@example.invalid'};
  await Promise.all([requestLead(f.client,input,async(email,token)=>sent.push({email,token})),requestLead(f.client,input,async(email,token)=>sent.push({email,token}))]);
  assert.equal(sent.length,1);assert.equal(f.lead.subscribed,false);assert.equal(f.lead.tokenHash,hash(sent[0].token));
  assert.equal(JSON.stringify(f.lead).includes(sent[0].token),false);
  assert.ok(f.lead.tokenExpiresAt>Date.now());assert.equal(f.events[0].choice,'request');
});

test('confirmation is single-use, rejects expiry, and never creates an account session',async()=>{
  const f=fixture();let token,syncs=0;
  await requestLead(f.client,{name:'Ada',email:'ada@example.invalid'},async(email,value)=>{token=value;});
  const result=await confirmLead(f.client,token,async(email,subscribed)=>{assert.equal(subscribed,true);syncs++;return 'synced';});
  assert.equal(result.pending,false);assert.equal(f.lead.subscribed,true);assert.equal(f.lead.tokenHash,null);assert.equal(syncs,1);
  await assert.rejects(confirmLead(f.client,token,async()=>{assert.fail('replay must not sync');}),/INVALID_LINK/);
  f.lead.tokenHash=hash(token);f.lead.tokenExpiresAt=new Date(Date.now()-1);
  await assert.rejects(confirmLead(f.client,token,async()=>{}),/INVALID_LINK/);
  assert.equal(f.events.filter(e=>e.choice==='confirm').length,1);
});

test('provider failure preserves confirmed consent; existing suppression is never cleared',async()=>{
  for(const blocked of [false,true]) {
    const f=fixture();let token;
    await requestLead(f.client,{name:'Ada',email:'ada@example.invalid'},async(email,value)=>{token=value;});
    const result=await confirmLead(f.client,token,async()=>{if(!blocked)throw Error('offline');return 'blocked';});
    assert.equal(f.lead.subscribed,true);assert.equal(result.pending,!blocked);assert.equal(result.blocked,blocked);
  }
});

test('confirmed lead transfers only marketing preference to an already verified account',async()=>{
  const f=fixture();f.owner={id:'verified-owner',status:'ACTIVE',emailVerifiedAt:new Date()};let token;
  await requestLead(f.client,{name:'Ada',email:'ada@example.invalid'},async(email,value)=>{token=value;});
  await confirmLead(f.client,token,async()=> 'synced');
  assert.equal(f.consent.accountId,'verified-owner');assert.equal(f.consent.source,'lead-confirm');assert.equal(f.consent.subscribed,true);
});

test('confirmed public leads join the campaign audience but later account withdrawal wins',async()=>{
  const env={UNSAIDBOX_EMAIL_LEADS_ENABLED:'true',UNSAIDBOX_MARKETING_ENABLED:'true',UNSAIDBOX_BREVO_API_KEY:'fixture',UNSAIDBOX_BREVO_FOLDER_ID:'23',UNSAIDBOX_BREVO_MARKETING_LIST_ID:'24'};
  const f=fixture();let token;
  await requestLead(f.client,{name:'Ada',email:'ada@example.invalid'},async(email,value)=>{token=value;});
  await confirmLead(f.client,token,async()=> 'synced');
  const call=async(path,method='GET')=>{
    if(path==='contacts/folders/23')return {name:'UnsaidBox'};
    if(path==='contacts/lists/24')return {name:'UnsaidBox · opted-in marketing',folderId:23};
    if(path.includes('/contacts?'))return {contacts:[]};
    if(path.startsWith('contacts/'))return null;
    if(path==='contacts'&&method==='POST')return {id:1};
    throw Error('unexpected '+path);
  };
  assert.equal((await reconcileAudience(f.client,call,env)).count,1);
  f.owner={id:'owner',status:'ACTIVE'};f.consent={subscribed:false};
  assert.equal((await reconcileAudience(f.client,call,env)).count,0);
});

test('popup defers to cookie/dialog/input interactions and protects pending modal dismissal',async()=>{
  const source=await readFile('components/LeadPopup.tsx','utf8');
  assert.match(source,/<Dialog.Content/);assert.match(source,/20000/);assert.match(source,/scrollY\/height<.35/);
  assert.match(source,/cookie-banner/);assert.match(source,/document.activeElement/);assert.match(source,/remember\(success\?365:30\)/);
  assert.match(source,/onEscapeKeyDown=.*pending.*preventDefault/);assert.match(source,/onPointerDownOutside=.*pending.*preventDefault/);
  const form=await readFile('components/LeadSignupForm.tsx','utf8');assert.match(form,/<Checkbox name="consent" required>/);assert.match(form,/secure\(data,'lead_subscribe'\)/);
  const actions=await readFile('app/updates/actions.ts','utf8');assert.match(actions,/verifyCaptcha\(form,'lead_subscribe'\)/);assert.match(actions,/verifyCaptcha\(form,'lead_confirm'\)/);
  const confirm=await readFile('components/LeadConfirmation.tsx','utf8');assert.match(confirm,/history.replaceState/);assert.match(confirm,/secure\(data,'lead_confirm'\)/);
});
