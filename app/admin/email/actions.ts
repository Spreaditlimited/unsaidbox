'use server';
import { unstable_rethrow } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdministrator } from '@/lib/admin-auth';
import { rateLimit } from '@/lib/auth';
import { db } from '@/lib/db';
import { verifyCaptcha } from '@/lib/captcha.mjs';
import { InputError } from '@/lib/security.mjs';
import { marketingEnabled, validateCampaign, renderCampaign } from '@/lib/marketing-policy.mjs';
import { submitCampaign } from '@/lib/marketing-store.mjs';
import { assertSender, sendBrevoMail } from '@/lib/brevo.mjs';
import type { Result } from '@/app/actions';

function enabled() {if (!marketingEnabled()) throw new InputError('Marketing email setup is not enabled yet.');}
function campaignId(form:FormData) {
  const id=String(form.get('id')??'');
  if (!/^[a-z0-9]{20,30}$/.test(id)) throw new InputError('Choose a valid campaign.');
  return id;
}
function failure(error:unknown):Result {
  unstable_rethrow(error);
  if (error instanceof InputError) return {error:error.message};
  const code=error instanceof Error?error.message:'';
  const messages:Record<string,string>={EMPTY_AUDIENCE:'There are no eligible opted-in recipients yet.',BREVO_DOMAIN:'Authenticate unsaidbox.com in Brevo before sending.',BREVO_SENDER:'Verify hello@unsaidbox.com in Brevo before sending.',MARKETING_ADDRESS:'Set the business postal address before sending.',WRONG_AUDIENCE:'The configured Brevo list does not belong to UnsaidBox.',AUDIENCE_LIMIT:'This audience needs a background dispatch before it can be sent. No campaign was submitted.',CAMPAIGN_ALREADY_SUBMITTED:'This draft has already been submitted. Review its status before taking another action.'};
  return {error:messages[code]??'Brevo did not confirm completion. Review the campaign status before trying again; an uncertain send is never retried automatically.'};
}

export async function createMarketingDraft(_:Result,form:FormData):Promise<Result> {
  try {
    const admin=await requireAdministrator();
    await verifyCaptcha(form,'createMarketingDraft');enabled();
    await rateLimit(`marketing-draft:${admin.id}`,20,3600);
    const draft=validateCampaign(Object.fromEntries(['subject','heading','preheader','body'].map(k=>[k,form.get(k)]))) as {subject:string;heading:string;preheader:string;body:string};
    await db().marketingCampaign.create({data:{...draft,createdBy:admin.id}});
    revalidatePath('/admin/email');
    return {success:'Draft saved. Review its preview and send a test before submitting it.'};
  } catch(error) {return failure(error);}
}

export async function testMarketingDraft(_:Result,form:FormData):Promise<Result> {
  try {
    const admin=await requireAdministrator();
    await verifyCaptcha(form,'testMarketingDraft');enabled();
    await rateLimit(`marketing-test:${admin.id}`,5,3600);
    const draft=await db().marketingCampaign.findUniqueOrThrow({where:{id:campaignId(form)}});
    await assertSender();
    const html=renderCampaign(draft,process.env.UNSAIDBOX_MARKETING_POSTAL_ADDRESS).replace('{{ unsubscribe }}','https://unsaidbox.com/dashboard/settings');
    await sendBrevoMail({to:'hello@unsaidbox.com',subject:`[TEST] ${draft.subject}`,html,text:`${draft.heading}\n\n${draft.body}\n\nTest only. Manage preferences: https://unsaidbox.com/dashboard/settings`,tag:'unsaidbox-marketing-test'});
    return {success:'Brevo accepted the test addressed to hello@unsaidbox.com. Check the mailbox to confirm receipt.'};
  } catch(error) {return failure(error);}
}

export async function sendMarketingDraft(_:Result,form:FormData):Promise<Result> {
  try {
    const admin=await requireAdministrator();
    await verifyCaptcha(form,'sendMarketingDraft');enabled();
    await rateLimit(`marketing-send:${admin.id}`,5,3600);
    if (form.get('confirm')!=='SEND' || form.get('reviewed')!=='on') throw new InputError('Review the preview, confirm the audience and type SEND.');
    await submitCampaign(db(),campaignId(form));
    revalidatePath('/admin/email');
    return {success:'Brevo accepted the campaign for processing. This does not confirm delivery to each recipient.'};
  } catch(error) {revalidatePath('/admin/email');return failure(error);}
}
