import test from 'node:test';
import assert from 'node:assert/strict';
import {subscriberStage,marketingSegments,syncDigestStage,verifyDigestAttribute,digestStageAttribute} from '../lib/marketing-segments.mjs';
import {buildDigest} from '../lib/weekly-digest.mjs';
import {renderCampaign} from '../lib/marketing-policy.mjs';
const account=(questions=0)=>({email:'owner@example.invalid',status:'ACTIVE',emailVerifiedAt:new Date(),_count:{questions}});
test('stages distinguish no account, no question, existing questions and unverified accounts',()=>{
 assert.equal(subscriberStage(null),'NO_ACCOUNT');assert.equal(subscriberStage(account()),'NO_QUESTION');assert.equal(subscriberStage(account(1)),'HAS_QUESTION');assert.equal(subscriberStage({...account(),emailVerifiedAt:null}),'VERIFY_EMAIL');assert.equal(subscriberStage({...account(),status:'SUSPENDED'}),null);assert.equal(subscriberStage({...account(),marketingConsent:{subscribed:false}}),null);
});
test('subscriber report deduplicates accounts/leads and excludes withdrawn owners',async()=>{
 const owners=[account(),{...account(2),email:'active@example.invalid'},{...account(),email:'withdrawn@example.invalid',marketingConsent:{subscribed:false}}];
 const leads=['owner','reader','withdrawn'].map((name)=>({email:name+'@example.invalid',firstName:name,confirmedAt:new Date()}));
 const c={marketingConsent:{findMany:async()=>owners.slice(0,2).map(a=>({account:a}))},marketingLead:{findMany:async()=>leads},account:{findMany:async()=>owners}};
 const result=await marketingSegments(c);assert.equal(result.total,3);assert.deepEqual(result.counts,{NO_ACCOUNT:1,NO_QUESTION:1,HAS_QUESTION:1,VERIFY_EMAIL:0});assert.equal(result.withoutAccounts[0].email,'reader@example.invalid');
});
test('personalization writes only namespaced stage and refuses invalid attribute schemas',async()=>{
 const calls=[];const call=async(...args)=>{calls.push(args);return {attributes:[{name:digestStageAttribute,type:'text',category:'normal'}]};};
 await verifyDigestAttribute(call);await syncDigestStage({account:{findUnique:async()=>account()}},'owner@example.invalid',call);
 assert.deepEqual(calls.at(-1)[2],{attributes:{UNSAIDBOX_AUDIENCE_STAGE:'NO_QUESTION'}});
 await assert.rejects(verifyDigestAttribute(async()=>({attributes:[]})),/CONFIG/);
});
test('one post only; lessons come from that post; conditional help excludes other stages',()=>{
 const first={title:'A useful lesson',slug:'one-post',excerpt:'A useful excerpt.',contentHtml:'<p>This is the opening of this useful article, giving some context to the reader.</p><p>Ask about one specific experience so the reader knows where to start with their feedback.</p><p>Leave room for an honest answer rather than steering people towards the answer you want.</p>'};
 const d={...buildDigest([first,{title:'Never feature me',slug:'second-post'}]),createdBy:'system:weekly-digest'};
 assert.match(d.body,/Ask about one specific/);assert.doesNotMatch(d.body,/second-post|Never feature me/);
 const html=renderCampaign(d,'Business address',{digestNudge:'conditional'});assert.match(html,/{% if contact.UNSAIDBOX_AUDIENCE_STAGE == "NO_QUESTION" %}/);assert.match(html,/Hit reply/);assert.match(html,/{% endif %}/);
 assert.doesNotMatch(renderCampaign(d,'Business address',{digestNudge:'hide'}),/Hit reply|{% if/);
 assert.doesNotMatch(renderCampaign({...d,createdBy:'admin'},'Business address'),/Hit reply|{% if/);
});
