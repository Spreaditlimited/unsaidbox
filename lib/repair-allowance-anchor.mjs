import { stripeReference } from './billing-runtime.mjs';

// Repairs missing metadata only. Never changes Stripe, entitlements or usage counters.
export async function repairAllowanceAnchors({client,stripe,accountId,mode,actorId}) {
  if(!['test','live'].includes(mode)||!accountId||!actorId)throw Error('ALLOWANCE_REPAIR_SCOPE');
  const customer=await client.billingCustomer.findUnique({where:{accountId_mode:{accountId,mode}},select:{id:true,stripeCustomerId:true}});
  if(!customer?.stripeCustomerId)throw Error('ALLOWANCE_CUSTOMER_MISSING');
  const missing=await client.billingSubscription.findMany({where:{customerId:customer.id,mode,recognized:true,status:{in:['active','past_due']},paidThrough:{gt:new Date()},allowanceAnchor:null},select:{id:true},take:21});
  if(missing.length>20)throw Error('ALLOWANCE_REPAIR_LIMIT');
  let repaired=0;
  for(const row of missing){
    const prefix=`${mode}:`;
    if(!row.id.startsWith(prefix))throw Error('ALLOWANCE_BINDING_MISMATCH');
    const id=row.id.slice(prefix.length);
    const subscription=await stripe.subscriptions.retrieve(id);
    if(subscription.id!==id||subscription.livemode!==(mode==='live')||stripeReference(subscription.customer)!==customer.stripeCustomerId)throw Error('ALLOWANCE_BINDING_MISMATCH');
    const seconds=subscription.billing_cycle_anchor;
    if(!Number.isSafeInteger(seconds)||seconds<=0||seconds*1000>Date.now())throw Error('ALLOWANCE_ANCHOR_UNAVAILABLE');
    repaired+=await client.$transaction(async tx=>{
      const changed=await tx.billingSubscription.updateMany({where:{id:row.id,customerId:customer.id,customer:{accountId,mode,stripeCustomerId:customer.stripeCustomerId},mode,allowanceAnchor:null},data:{allowanceAnchor:new Date(seconds*1000)}});
      if(changed.count)await tx.auditEvent.create({data:{actorId,targetId:accountId,action:'billing:missing_allowance_anchor_repaired'}});
      return changed.count;
    });
  }
  return repaired;
}
