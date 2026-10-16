import { randomBytes,createHash } from 'node:crypto';
import { consentStatement,consentVersion } from './marketing-policy.mjs';
import { withAudienceLock } from './marketing-store.mjs';
import { syncMembership } from './brevo.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');

export async function requestLead(client,input,send) {
  const token=randomBytes(32).toString('hex'),now=new Date();
  const reserved=await withAudienceLock(client,async tx=>{
    const row=await tx.marketingLead.upsert({where:{email:input.email},create:{email:input.email,firstName:input.name,consentStatement,consentVersion,consentedAt:now,requestedAt:new Date(0)},update:{}});
    if (row.subscribed||now.getTime()-row.requestedAt.getTime()<600000) return false;
    await tx.marketingLead.update({where:{id:row.id},data:{firstName:input.name,consentStatement,consentVersion,consentedAt:now,requestedAt:now,tokenHash:hash(token),tokenExpiresAt:new Date(now.getTime()+86400000)}});
    await tx.marketingLeadEvent.create({data:{leadId:row.id,choice:'request',statement:consentStatement,version:consentVersion}});
    return true;
  });
  // The token is hashed at rest and sent once. Explicit retries are throttled;
  // ambiguous email acceptance never creates an automatic second send.
  if (reserved) await send(input.email,token);
}

export async function confirmLead(client,value,sync=syncMembership) {
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error('INVALID_LINK');
  const email=await withAudienceLock(client,async tx=>{
    const row=await tx.marketingLead.findUnique({where:{tokenHash:hash(value)}});
    if (!row?.tokenExpiresAt||row.tokenExpiresAt<=new Date()) throw new Error('INVALID_LINK');
    const now=new Date();
    await tx.marketingLead.update({where:{id:row.id},data:{subscribed:true,confirmedAt:now,withdrawnAt:null,tokenHash:null,tokenExpiresAt:null}});
    await tx.marketingLeadEvent.create({data:{leadId:row.id,choice:'confirm',statement:row.consentStatement,version:row.consentVersion}});
    // Confirming a mailbox grants marketing consent only, never an account session.
    const owner=await tx.account.findUnique({where:{email:row.email},select:{id:true,status:true,emailVerifiedAt:true}});
    if (owner?.status==='ACTIVE'&&owner.emailVerifiedAt) {
      const data={subscribed:true,source:'lead-confirm',statement:row.consentStatement,version:row.consentVersion};
      await tx.marketingConsent.upsert({where:{accountId:owner.id},create:{accountId:owner.id,...data},update:{...data,chosenAt:now}});
      await tx.marketingConsentEvent.create({data:{accountId:owner.id,...data}});
    }
    return row.email;
  });
  // The local confirmation is durable even when Brevo is temporarily unavailable.
  // Re-read under the dispatch lock: a newer account withdrawal wins.
  try {
    return await withAudienceLock(client,async tx=>{
      const row=await tx.marketingLead.findUniqueOrThrow({where:{email}});
      const owner=await tx.account.findUnique({where:{email},select:{status:true,marketingConsent:true}});
      const subscribed=row.subscribed&&owner?.status!=='SUSPENDED'&&owner?.marketingConsent?.subscribed!==false;
      const result=await sync(email,subscribed);
      return {pending:false,blocked:result==='blocked'};
    });
  } catch {return {pending:true,blocked:false};}
}
