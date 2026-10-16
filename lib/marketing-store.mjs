import {verifyDigestAttribute,syncDigestStage} from './marketing-segments.mjs';
import { consentStatement, consentVersion, eligibleSubscriber, suppressed, campaignTag, renderCampaign } from './marketing-policy.mjs';
import { brevo, verifyAudience, syncMembership, assertSender } from './brevo.mjs';
import { leadEnabled } from './lead-policy.mjs';

// All local choices and sends acquire the same database row lock. No account ID
// comes from a form; callers must supply their authenticated server identity.
export async function withAudienceLock(client, work) {
  return client.$transaction(async tx => {
    await tx.marketingControl.update({where:{id:1},data:{revision:{increment:1}}});
    return work(tx);
  }, {maxWait:10000,timeout:180000});
}

export async function saveConsent(client, accountId, subscribed, source) {
  if (!['settings','banner'].includes(source)) throw new Error('CONSENT_SOURCE');
  await withAudienceLock(client, async tx => {
    const account = await tx.account.findUnique({where:{id:accountId},select:{email:true,status:true,emailVerifiedAt:true}});
    if (subscribed && (account?.status !== 'ACTIVE' || !account.emailVerifiedAt)) throw new Error('VERIFY_EMAIL');
    if (!account) throw new Error('ACCOUNT_MISSING');
    const data = {subscribed,source,statement:consentStatement,version:consentVersion};
    await tx.marketingConsent.upsert({where:{accountId},create:{accountId,...data},update:{...data,chosenAt:new Date()}});
    await tx.marketingConsentEvent.create({data:{accountId,...data}});
    if (leadEnabled()) {
      const lead=await tx.marketingLead.findUnique({where:{email:account.email.toLowerCase()}});
      if (lead) {
        await tx.marketingLead.update({where:{id:lead.id},data:{subscribed,withdrawnAt:subscribed?null:new Date(),tokenHash:null,tokenExpiresAt:null}});
        await tx.marketingLeadEvent.create({data:{leadId:lead.id,choice:subscribed?'account-opt-in':'account-withdrawal',statement:consentStatement,version:consentVersion}});
      }
    }
  });
}

// No automatic enrolment. Reconcile ONLY this brand's list immediately before a
// send. Never clear shared suppression, edit attributes or touch another list.
export async function reconcileAudience(tx, call = brevo, env = process.env, {weeklyDigest=false}={}) {
  if(weeklyDigest)await verifyDigestAttribute(call);
  const {listId} = await verifyAudience(call,env);
  const rows = await tx.marketingConsent.findMany({where:{subscribed:true},include:{account:{select:{email:true,status:true,emailVerifiedAt:true}}},take:101});
  // Bound network work and fail closed rather than silently truncate recipients.
  if (rows.length > 100) throw new Error('AUDIENCE_LIMIT');
  const desired = new Set();
  for (const row of rows) {
    if (!eligibleSubscriber(row)) continue;
    const email = row.account.email.toLowerCase();
    const contact = await call('contacts/' + encodeURIComponent(email));
    if (suppressed(contact,listId)) continue;
    desired.add(email);
  }
  if (leadEnabled(env)) {
    const leads=await tx.marketingLead.findMany({where:{subscribed:true,confirmedAt:{not:null}},take:101});
    if (leads.length>100) throw new Error('AUDIENCE_LIMIT');
    for (const lead of leads) {
      const email=lead.email.toLowerCase();
      const owner=await tx.account.findUnique({where:{email},select:{status:true,marketingConsent:true}});
      // A later account choice is authoritative; a lead cannot bypass suspension.
      if (owner?.status==='SUSPENDED'||owner?.marketingConsent?.subscribed===false) continue;
      const contact=await call('contacts/'+encodeURIComponent(email));
      if (!suppressed(contact,listId)) desired.add(email);
    }
  }
  if (desired.size>100) throw new Error('AUDIENCE_LIMIT');
  // Read every page before mutating membership (offsets must remain stable).
  const current = [];
  let complete = false;
  for (let offset=0;offset<10000;offset+=500) {
    const page = await call(`contacts/lists/${listId}/contacts?limit=500&offset=${offset}`);
    if (!Array.isArray(page?.contacts)) throw new Error('BREVO_UNAVAILABLE');
    current.push(...page.contacts);
    if (page.contacts.length < 500) {complete=true;break;}
  }
  if (!complete) throw new Error('AUDIENCE_LIMIT');
  for (const contact of current) {
    const email = String(contact.email??'').toLowerCase();
    if (!email) throw new Error('BREVO_UNAVAILABLE');
    if (!desired.has(email)) await call('contacts/' + encodeURIComponent(email),'PUT',{unlinkListIds:[listId]});
  }
  let count=0;
  for (const email of desired) if (await syncMembership(email,true,call,env) === 'synced') {
    if(weeklyDigest)await syncDigestStage(tx,email,call);
    count++;
  }
  return {listId,count};
}

export async function syncAccountConsent(client, accountId) {
  return withAudienceLock(client,async tx => {
    const row=await tx.marketingConsent.findUnique({where:{accountId},include:{account:{select:{email:true,status:true,emailVerifiedAt:true}}}});
    if (!row) return 'synced';
    return syncMembership(row.account.email,eligibleSubscriber(row));
  });
}

export async function submitCampaign(client,id,{call=brevo,env=process.env}={}) {
  // Commit a durable claim before any provider mutation. Crashes/timeouts leave a
  // non-retryable status for manual reconciliation; they never trigger a resend.
  const claimed=await client.marketingCampaign.updateMany({where:{id,status:'DRAFT'},data:{status:'PREPARING'}});
  if (!claimed.count) throw new Error('CAMPAIGN_ALREADY_SUBMITTED');
  try {
    const draft=await client.marketingCampaign.findUniqueOrThrow({where:{id}});
    if(draft.createdBy==='system:weekly-digest') {
      const slugs=[...draft.body.matchAll(/https:\/\/unsaidbox\.com\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)/g)].map(m=>m[1]);
      const publicCount=await client.blogPost.count({where:{slug:{in:slugs},published:true,publishAt:{lte:new Date()}}});
      if(!slugs.length||publicCount!==new Set(slugs).size)throw new Error('DIGEST_POST_UNAVAILABLE');
    }
    await assertSender(call);
    await verifyAudience(call,env);
    const htmlContent=renderCampaign(draft,env.UNSAIDBOX_MARKETING_POSTAL_ADDRESS,{digestNudge:'conditional'});
    let providerId=draft.providerId;
    const content={name:`UnsaidBox · ${id}`,type:'classic',tag:campaignTag,subject:draft.subject,previewText:draft.preheader,
      sender:{name:'UnsaidBox',email:'hello@unsaidbox.com'},replyTo:'hello@unsaidbox.com',htmlContent};
    if (!providerId) {
      // Create without recipients: no audience is attached until we hold the
      // consent lock. Persist its ID before the send, using just one DB connection.
      const result=await call('emailCampaigns','POST',content);
      if (!Number.isSafeInteger(result?.id)||result.id<1) throw new Error('BREVO_UNCERTAIN');
      providerId=result.id;
      await client.marketingCampaign.update({where:{id},data:{providerId}});
    } else {
      const existing=await call(`emailCampaigns/${providerId}`);
      if (existing?.status!=='draft' || existing.name!==content.name || existing.tag!==campaignTag || existing.sender?.email?.toLowerCase()!=='hello@unsaidbox.com') throw new Error('CAMPAIGN_STATE');
    }
    await withAudienceLock(client,async tx => {
      const {listId,count}=await reconcileAudience(tx,call,env,{weeklyDigest:draft.createdBy==='system:weekly-digest'});
      if (!count) throw new Error('EMPTY_AUDIENCE');
      await call(`emailCampaigns/${providerId}`,'PUT',{...content,recipients:{listIds:[listId],exclusionListIds:[],segmentIds:[]}});
      await call(`emailCampaigns/${providerId}/sendNow`,'POST');
      await tx.marketingCampaign.update({where:{id},data:{recipientCount:count,status:'ACCEPTED',submittedAt:new Date()}});
    });
  } catch (error) {
    const recoverable=['EMPTY_AUDIENCE','BREVO_SENDER','BREVO_DOMAIN','MARKETING_ADDRESS','MARKETING_CONFIG','WRONG_AUDIENCE','AUDIENCE_LIMIT'].includes(error?.message);
    await client.marketingCampaign.updateMany({where:{id,status:{in:['PREPARING','SUBMITTING']}},data:{status:recoverable?'DRAFT':'NEEDS_REVIEW'}});
    throw error;
  }
}
