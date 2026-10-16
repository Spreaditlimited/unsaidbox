import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { audienceConfig, eligibleSubscriber, consentStatement, consentVersion, validateCampaign, renderCampaign } from '../lib/marketing-policy.mjs';
import { brevo, syncMembership, sendBrevoMail } from '../lib/brevo.mjs';
import { saveConsent, reconcileAudience, submitCampaign } from '../lib/marketing-store.mjs';
import { emailConfig } from '../lib/email-config.mjs';

const env={UNSAIDBOX_BREVO_API_KEY:'synthetic-test-key',UNSAIDBOX_BREVO_FOLDER_ID:'23',UNSAIDBOX_BREVO_MARKETING_LIST_ID:'24',UNSAIDBOX_MARKETING_POSTAL_ADDRESS:'Test address only'};
const draft={subject:'Your next good question',heading:'Make room for honest feedback.',preheader:'A practical tip',body:'Ask one specific question.\n\nListen before sharing.'};
const row=(email,extra={})=>({accountId:email,subscribed:true,account:{email,status:'ACTIVE',emailVerifiedAt:new Date()},...extra});
function provider({contacts={},current=[],failSend=false}={}) {
  const calls=[];const byEmail=new Map(Object.entries(contacts));
  const call=async(path,method='GET',body)=>{
    calls.push({path,method,body});
    if(path==='contacts/folders/23')return {name:'UnsaidBox'};
    if(path==='contacts/lists/24')return {name:'UnsaidBox · opted-in marketing',folderId:23};
    if(path.startsWith('contacts/lists/24/contacts?'))return {contacts:current};
    if(path==='senders')return {senders:[{email:'hello@unsaidbox.com',active:true}]};
    if(path==='senders/domains/unsaidbox.com')return {authenticated:true};
    if(path==='contacts'&&method==='POST'){byEmail.set(body.email,{listIds:body.listIds});return {id:5};}
    if(path.startsWith('contacts/')){const email=decodeURIComponent(path.slice(9));if(method==='GET')return byEmail.get(email)??null;return {};}
    if(path==='emailCampaigns')return {id:70};
    if(path==='emailCampaigns/70'&&method==='PUT')return {};
    if(path.endsWith('/sendNow')){if(failSend)throw new Error('BREVO_UNCERTAIN');return {};}
    throw Error('Unexpected mock request: '+path);
  };
  return {calls,call};
}
function store(rows=[row('opted@example.invalid')]) {
  const campaign={id:'cmcampaign00000000000000',status:'DRAFT',...draft};
  const events=[];let choice=null;
  const client={
    marketingControl:{update:async()=>({})},
    account:{findUnique:async()=>rows[0]?.account},
    marketingConsent:{findMany:async()=>rows,upsert:async({create})=>{choice=create;}},
    marketingConsentEvent:{create:async({data})=>events.push(data)},
    marketingCampaign:{
      findUniqueOrThrow:async()=>({...campaign}),
      updateMany:async({where,data})=>{const matches=typeof where.status==='string'?campaign.status===where.status:where.status.in.includes(campaign.status);if(!matches)return {count:0};Object.assign(campaign,data);return {count:1};},
      update:async({data})=>Object.assign(campaign,data),
    },
    $transaction:async work=>work(client),
  };
  return {client,campaign,events,get choice(){return choice;}};
}

test('marketing config requires explicit brand-specific list IDs and credentials',()=>{
  assert.throws(()=>audienceConfig({}));
  assert.throws(()=>audienceConfig({...env,UNSAIDBOX_BREVO_MARKETING_LIST_ID:'0'}));
  assert.deepEqual(audienceConfig(env),{folderId:23,listId:24});
  assert.equal(eligibleSubscriber(row('a')),true);
  assert.equal(eligibleSubscriber(row('a',{subscribed:false})),false);
  assert.equal(eligibleSubscriber(row('a',{account:{status:'ACTIVE',emailVerifiedAt:null}})),false);
  assert.equal(eligibleSubscriber(row('a',{account:{status:'SUSPENDED',emailVerifiedAt:new Date()}})),false);
});

test('consent stores exact wording, version, time-bearing history and decline choice',async()=>{
  const s=store();await saveConsent(s.client,'authenticated-account',false,'banner');
  assert.equal(s.choice.accountId,'authenticated-account');
  assert.equal(s.choice.subscribed,false);
  assert.equal(s.events[0].statement,consentStatement);
  assert.equal(s.events[0].version,consentVersion);
  assert.equal(s.events[0].source,'banner');
  const unverified=store([row('a',{account:{status:'ACTIVE',emailVerifiedAt:null}})]);
  await assert.rejects(saveConsent(unverified.client,'a',true,'settings'),/VERIFY_EMAIL/);
  assert.equal(unverified.events.length,0);
});

test('membership changes preserve shared contact attributes, other lists and suppression',async()=>{
  for(const blocked of [{emailBlacklisted:true},{listUnsubscribed:[24]}]){
    const p=provider({contacts:{'a@example.invalid':blocked}});
    assert.equal(await syncMembership('a@example.invalid',true,p.call,env),'blocked');
    assert.equal(p.calls.some(c=>c.method!=='GET'),false);
  }
  const p=provider({contacts:{'a@example.invalid':{listIds:[20,24],attributes:{OTHER_BRAND:'keep'}}}});
  await syncMembership('a@example.invalid',false,p.call,env);
  assert.deepEqual(p.calls.find(c=>c.method==='PUT').body,{unlinkListIds:[24]});
  const other=async(path)=>path.includes('folders')?{name:'Effikos'}:{folderId:19,name:'Other list'};
  await assert.rejects(syncMembership('a@example.invalid',true,other,env),/WRONG_AUDIENCE/);
});

test('send audience excludes unverified, withdrawn and provider-suppressed contacts',async()=>{
  const s=store([row('yes@example.invalid'),row('blocked@example.invalid'),row('unverified@example.invalid',{account:{email:'unverified@example.invalid',status:'ACTIVE',emailVerifiedAt:null}}),row('withdrawn@example.invalid',{subscribed:false})]);
  const p=provider({contacts:{'blocked@example.invalid':{emailBlacklisted:true}},current:[{email:'outsider@example.invalid',listIds:[20,24]}]});
  const result=await reconcileAudience(s.client,p.call,env);
  assert.equal(result.count,1);
  assert.deepEqual(p.calls.find(c=>c.path==='contacts'&&c.method==='POST').body,{email:'yes@example.invalid',listIds:[24],updateEnabled:false});
  assert.deepEqual(p.calls.find(c=>c.path.includes('outsider')&&c.method==='PUT').body,{unlinkListIds:[24]});
});

test('audience never silently truncates an oversized subscriber set',async()=>{
  const s=store(Array.from({length:101},(_,i)=>row(i+'@example.invalid')));const p=provider();
  await assert.rejects(reconcileAudience(s.client,p.call,env),/AUDIENCE_LIMIT/);
  assert.equal(p.calls.some(c=>c.method!=='GET'),false);
});

test('campaign double submission sends once and uses only the verified UnsaidBox list',async()=>{
  const s=store();const p=provider();
  const result=await Promise.allSettled([submitCampaign(s.client,s.campaign.id,{call:p.call,env}),submitCampaign(s.client,s.campaign.id,{call:p.call,env})]);
  assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(p.calls.filter(c=>c.path.endsWith('/sendNow')).length,1);
  assert.equal(s.campaign.status,'ACCEPTED');assert.equal(s.campaign.providerId,70);
  const payload=p.calls.find(c=>c.path==='emailCampaigns/70'&&c.method==='PUT').body;
  assert.deepEqual(payload.recipients,{listIds:[24],exclusionListIds:[],segmentIds:[]});assert.equal(payload.sender.email,'hello@unsaidbox.com');
  assert.match(payload.htmlContent,/\{\{ unsubscribe \}\}/);
});

test('uncertain campaign keeps its provider ID and blocks retries',async()=>{
  const s=store();const p=provider({failSend:true});
  await assert.rejects(submitCampaign(s.client,s.campaign.id,{call:p.call,env}),/BREVO_UNCERTAIN/);
  assert.equal(s.campaign.status,'NEEDS_REVIEW');assert.equal(s.campaign.providerId,70);
  await assert.rejects(submitCampaign(s.client,s.campaign.id,{call:p.call,env}),/ALREADY_SUBMITTED/);
  assert.equal(p.calls.filter(c=>c.path==='emailCampaigns').length,1);
});

test('an empty audience leaves a reusable draft without submitting a campaign',async()=>{
  const s=store([]);const p=provider();
  await assert.rejects(submitCampaign(s.client,s.campaign.id,{call:p.call,env}),/EMPTY_AUDIENCE/);
  assert.equal(s.campaign.status,'DRAFT');assert.equal(s.campaign.providerId,70);assert.equal(p.calls.some(c=>c.path.endsWith('/sendNow')),false);
});

test('email content escapes HTML and rejects provider-template injection',()=>{
  assert.throws(()=>validateCampaign({...draft,body:'{{ contact.EMAIL }}'}));
  assert.throws(()=>validateCampaign({...draft,subject:'Bad\nheader'}));
  assert.throws(()=>renderCampaign(draft,''));
  const html=renderCampaign({...draft,body:'<script>alert(1)</script>'},'Address <safe>');
  assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);assert.match(html,/Address &lt;safe&gt;/);
});

test('Brevo transport needs a receipt and classifies ambiguous requests safely',async()=>{
  const message={to:'owner@example.invalid',subject:'Test',html:'<p>Test</p>',text:'Test',tag:'test'};
  await assert.rejects(sendBrevoMail(message,{env,request:async()=>new Response('{}',{status:201})}),/BREVO_UNCERTAIN/);
  await assert.rejects(brevo('smtp/email','POST',{}, {env,request:async()=>{throw Error('private credentials');}}),/BREVO_UNCERTAIN/);
  await assert.rejects(brevo('smtp/email','POST',{}, {env,request:async()=>new Response('{}',{status:400})}),/BREVO_REJECTED/);
  const receipt=await sendBrevoMail(message,{env,request:async(url,options)=>{const body=JSON.parse(options.body);assert.equal(body.sender.email,'hello@unsaidbox.com');assert.equal(body.tags[0],'unsaidbox');return Response.json({messageId:'receipt'});}});
  assert.equal(receipt,'receipt');
  const config=emailConfig({...env,UNSAIDBOX_APP_URL:'https://unsaidbox.com',UNSAIDBOX_EMAIL_KEY:'a'.repeat(64),UNSAIDBOX_MAIL_PROVIDER:'brevo'});
  assert.equal(config.provider,'brevo');assert.equal(config.smtp,null);
});

test('marketing actions require server CAPTCHA and separate administrator authentication',async()=>{
  const actions=await readFile('app/admin/email/actions.ts','utf8');
  for(const name of ['createMarketingDraft','testMarketingDraft','sendMarketingDraft'])assert.match(actions,new RegExp(`verifyCaptcha\\(form,'${name}'\\)`));
  assert.equal((actions.match(/await requireAdministrator\(\)/g)||[]).length,3);
  const choice=await readFile('app/marketing-actions.ts','utf8');assert.match(choice,/verifyCaptcha\(form,'saveMarketingConsent'\)/);assert.match(choice,/saveConsent\(db\(\),account.id/);
});
