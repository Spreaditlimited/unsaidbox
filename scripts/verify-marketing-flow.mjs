import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {PrismaClient} from '../generated/prisma/index.js';
import {validateDatabaseUrl} from '../lib/database-url.mjs';
import {confirmLead} from '../lib/lead-store.mjs';
import {saveConsent,withAudienceLock} from '../lib/marketing-store.mjs';
import {brevo,syncMembership,sendBrevoMail,assertSender} from '../lib/brevo.mjs';
import {audienceConfig,validateCampaign,renderCampaign} from '../lib/marketing-policy.mjs';
const client=new PrismaClient({datasources:{db:{url:validateDatabaseUrl(process.env.UNSAIDBOX_DATABASE_URL)}}});
try{
 const test=JSON.parse(await readFile('.vercel/marketing-activation/test-confirmation.json','utf8'));
 const before=await client.marketingLead.findUniqueOrThrow({where:{email:'hello@unsaidbox.com'}});
 assert.equal(before.firstName,'UnsaidBox test');assert.equal(before.subscribed,false);
 const page=await fetch('http://localhost:3001/updates/confirm#'+test.token);
 assert.equal(page.status,200);
 assert.equal((await client.marketingLead.findUniqueOrThrow({where:{id:before.id}})).subscribed,false,'GET must not confirm');
 const confirmed=await confirmLead(client,test.token);assert.equal(confirmed.pending,false);assert.equal(confirmed.blocked,false);
 const {listId}=audienceConfig();
 const contact=await brevo('contacts/'+encodeURIComponent('hello@unsaidbox.com'));
 assert.ok(contact.listIds.includes(listId));
 await assert.rejects(confirmLead(client,test.token),/INVALID_LINK/);
 const account=await client.account.findUnique({where:{email:'hello@unsaidbox.com'},select:{id:true}});
 if(account)await saveConsent(client,account.id,false,'settings');
 else await withAudienceLock(client,async tx=>{
  await tx.marketingLead.update({where:{id:before.id},data:{subscribed:false,withdrawnAt:new Date()}});
  await tx.marketingLeadEvent.create({data:{leadId:before.id,choice:'test-withdrawal',statement:before.consentStatement,version:before.consentVersion}});
 });
 await syncMembership('hello@unsaidbox.com',false);
 const removed=await brevo('contacts/'+encodeURIComponent('hello@unsaidbox.com'));
 assert.ok(!removed?.listIds?.includes(listId));
 const admin=await client.administrator.findFirst({where:{active:true},select:{id:true}});
 if(!admin)throw Error('NO_ACTIVE_ADMINISTRATOR');
 const content=validateCampaign(JSON.parse(await readFile('docs/email/first-campaign.json','utf8')));
 let draft=await client.marketingCampaign.findFirst({where:{subject:content.subject,status:'DRAFT'}});
 if(!draft)draft=await client.marketingCampaign.create({data:{...content,createdBy:admin.id}});
 await assertSender();
 const html=renderCampaign(content,process.env.UNSAIDBOX_MARKETING_POSTAL_ADDRESS).replace('{{ unsubscribe }}','https://unsaidbox.com/dashboard/settings');
 const receipt=await sendBrevoMail({to:'hello@unsaidbox.com',subject:'[TEST] '+content.subject,html,text:content.heading+'\n\n'+content.body+'\n\nTest email. Preferences: https://unsaidbox.com/dashboard/settings',tag:'unsaidbox-marketing-test'});
 const report={checkedAt:new Date().toISOString(),browserSignupRecorded:true,confirmationReceived:true,getDoesNotConfirm:true,confirmationSynced:true,replayRejected:true,withdrawalSynced:true,testAddressUnsubscribed:true,firstCampaignDraftId:draft.id,marketingTestAccepted:true,marketingTestReceipt:receipt};
 await writeFile('docs/email/flow-verification.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({...report,marketingTestReceipt:'stored in report'}));
}catch(e){console.error('FLOW_VERIFICATION_STOPPED',/^[A-Z_]+$/.test(e?.message??'')?e.message:e?.code??'CHECK_PRIVATE_TEST_STATE');process.exitCode=1;}
finally{await client.$disconnect();}
