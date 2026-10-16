// Only this brand's field is written; other shared Brevo attributes stay intact.
export const digestStageAttribute='UNSAIDBOX_AUDIENCE_STAGE';
export function subscriberStage(account) {
  if(!account)return 'NO_ACCOUNT';
  if(account.status!=='ACTIVE'||account.marketingConsent?.subscribed===false)return null;
  if(!account.emailVerifiedAt)return 'VERIFY_EMAIL';
  return account._count?.questions===0?'NO_QUESTION':'HAS_QUESTION';
}
export async function verifyDigestAttribute(call) {
  const result=await call('contacts/attributes');
  if(!result?.attributes?.some(a=>a.name===digestStageAttribute&&a.category==='normal'&&a.type==='text'))throw Error('DIGEST_ATTRIBUTE_CONFIG');
}
export async function syncDigestStage(tx,email,call) {
  const account=await tx.account.findUnique({where:{email},select:{status:true,emailVerifiedAt:true,marketingConsent:true,_count:{select:{questions:true}}}});
  const stage=subscriberStage(account);
  if(!stage)throw Error('DIGEST_AUDIENCE_CHANGED');
  await call('contacts/'+encodeURIComponent(email),'PUT',{attributes:{[digestStageAttribute]:stage}});
}
export async function marketingSegments(client) {
  const [consents,leads]=await Promise.all([
    client.marketingConsent.findMany({where:{subscribed:true,account:{status:'ACTIVE',emailVerifiedAt:{not:null}}},select:{account:{select:{email:true,status:true,emailVerifiedAt:true,_count:{select:{questions:true}}}}}}),
    client.marketingLead.findMany({where:{subscribed:true,confirmedAt:{not:null}},select:{email:true,firstName:true,confirmedAt:true}}),
  ]);
  const audience=new Map(consents.map(c=>[c.account.email.toLowerCase(),{email:c.account.email,stage:subscriberStage(c.account)}]));
  for(let i=0;i<leads.length;i+=500){
    const batch=leads.slice(i,i+500);
    const accounts=await client.account.findMany({where:{email:{in:batch.map(l=>l.email)}},select:{email:true,status:true,emailVerifiedAt:true,marketingConsent:true,_count:{select:{questions:true}}}});
    const owners=new Map(accounts.map(a=>[a.email.toLowerCase(),a]));
    for(const lead of batch){const stage=subscriberStage(owners.get(lead.email.toLowerCase()));if(stage)audience.set(lead.email.toLowerCase(),{...lead,stage});else audience.delete(lead.email.toLowerCase());}
  }
  const rows=[...audience.values()];
  const counts=Object.fromEntries(['NO_ACCOUNT','NO_QUESTION','HAS_QUESTION','VERIFY_EMAIL'].map(stage=>[stage,rows.filter(r=>r.stage===stage).length]));
  return {counts,total:rows.length,withoutAccounts:rows.filter(r=>r.stage==='NO_ACCOUNT').sort((a,b)=>new Date(b.confirmedAt)-new Date(a.confirmedAt)).slice(0,100)};
}
