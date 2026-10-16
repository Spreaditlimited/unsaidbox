import test from 'node:test';
import assert from 'node:assert/strict';
import {repairAllowanceAnchors} from '../lib/repair-allowance-anchor.mjs';
const anchor=Math.floor(Date.now()/1000)-86400;
function fixture(overrides={}){
  const state={writes:[],audits:[],anchor:null};
  const client={
    billingCustomer:{findUnique:async({where})=>{assert.deepEqual(where.accountId_mode,{accountId:'owner',mode:'test'});return{id:'binding',stripeCustomerId:'cus_owner'};}},
    billingSubscription:{findMany:async({where})=>{assert.equal(where.allowanceAnchor,null);assert.equal(where.mode,'test');return state.anchor?[]:[{id:'test:sub_example'}];},updateMany:async({where,data})=>{assert.equal(where.customer.accountId,'owner');assert.equal(where.mode,'test');assert.equal(where.allowanceAnchor,null);assert.deepEqual(Object.keys(data),['allowanceAnchor']);state.writes.push(data);state.anchor=data.allowanceAnchor;return{count:1};}},
    auditEvent:{create:async({data})=>{state.audits.push(data);}},
    $transaction:async fn=>fn(client),
  };
  const stripe={subscriptions:{retrieve:async id=>({id,customer:'cus_owner',livemode:false,billing_cycle_anchor:anchor,...overrides})}};
  return{state,run:()=>repairAllowanceAnchors({client,stripe,accountId:'owner',mode:'test',actorId:'admin'})};
}
test('missing date repair uses verified Stripe anchor, audits and preserves all other fields',async()=>{
  const f=fixture();assert.equal(await f.run(),1);assert.equal(f.state.anchor.getTime(),anchor*1000);assert.equal(f.state.audits[0].actorId,'admin');assert.equal(f.state.audits[0].targetId,'owner');assert.equal(await f.run(),0);assert.equal(f.state.writes.length,1);
});
test('repair rejects different customer, environment or subscription',async()=>{
  for(const changes of [{customer:'cus_other'},{livemode:true},{id:'sub_other'}]){const f=fixture(changes);await assert.rejects(f.run(),/BINDING_MISMATCH/);assert.equal(f.state.writes.length,0);}
});
test('repair never guesses a missing, invalid or future allowance anchor',async()=>{
  for(const value of [null,0,-1,'123',1.5,Math.floor(Date.now()/1000)+86400]){const f=fixture({billing_cycle_anchor:value});await assert.rejects(f.run(),/ANCHOR_UNAVAILABLE/);assert.equal(f.state.writes.length,0);}
});
