'use server';
import { createHmac } from 'node:crypto';
import { db } from '@/lib/db';
import { currentAccount,rateLimit } from '@/lib/auth';
import { verifyCaptcha } from '@/lib/captcha.mjs';
import { appOrigin } from '@/lib/email-config.mjs';
import { sendBrevoMail,assertSender } from '@/lib/brevo.mjs';
import { leadEnabled,validateLead } from '@/lib/lead-policy.mjs';
import { consentVersion } from '@/lib/marketing-policy.mjs';
import { requestLead,confirmLead } from '@/lib/lead-store.mjs';
import type { Result } from '@/app/actions';

export async function leadInvitationAvailable() {
  if (!leadEnabled()) return false;
  try {return !(await currentAccount());} catch {return false;}
}

export async function joinEmailUpdates(_:Result,form:FormData):Promise<Result> {
  try {
    if (!leadEnabled()) throw new Error('DISABLED');
    await verifyCaptcha(form,'lead_subscribe');
    if (form.get('website')) throw new Error('INVALID_LEAD');
    const input=validateLead({name:form.get('name'),email:form.get('email'),consent:form.get('consent')==='on',version:form.get('version')},consentVersion);
    const key=process.env.UNSAIDBOX_EMAIL_KEY;
    if (!/^[a-f0-9]{64}$/.test(key??'')) throw new Error('DISABLED');
    await rateLimit('lead-request-global',300,3600);
    await rateLimit('lead-email:'+createHmac('sha256',key!).update(input.email).digest('hex'),5,3600);
    await assertSender();
    await requestLead(db(),input,async(email:string,token:string)=>{
      const url=appOrigin()+'/updates/confirm#'+token;
      await sendBrevoMail({to:email,subject:'Confirm your UnsaidBox email updates',tag:'unsaidbox-newsletter-confirm',
        text:`You asked for UnsaidBox tips, product updates and occasional offers. Confirm your email to join:\n${url}\n\nThe link expires in 24 hours. If you did not request this, ignore this email. You will not be subscribed.`,
        html:`<html lang="en"><body style="margin:0;padding:32px 20px;background:#faf9f6;font-family:Arial,sans-serif;color:#202332"><div style="max-width:560px;margin:auto;padding:32px;background:white;border:1px solid #e4e2e9;border-top:4px solid #5850b8;border-radius:16px"><p style="font-size:26px;color:#5850b8"><b>Unsaid</b>Box</p><h1 style="font-size:28px">One more step.</h1><p style="line-height:1.8">You asked for UnsaidBox tips, product updates and occasional offers. Confirm your email to join.</p><p style="margin:28px 0"><a href="${url}" style="display:inline-block;background:#5850b8;color:white;padding:16px 24px;border-radius:9px;text-decoration:none">Confirm my subscription</a></p><p style="font-size:13px;line-height:1.7;color:#646572">This link expires in 24 hours. If you did not request this, ignore this email. You will not be subscribed.</p></div></body></html>`});
    });
    return {success:'If your address needs confirmation, a link will arrive shortly. Already confirmed? You are all set. Check your spam folder too.'};
  } catch {return {error:'We could not complete your request. Check your details and try again in a few minutes.'};}
}

export async function confirmEmailUpdates(_:Result,form:FormData):Promise<Result> {
  try {
    if (!leadEnabled()) throw new Error('DISABLED');
    await verifyCaptcha(form,'lead_confirm');
    await rateLimit('lead-confirm-global',1000,3600);
    const result=await confirmLead(db(),String(form.get('token')??''));
    return {success:result.blocked?'Your email is confirmed, but Brevo has an existing unsubscribe or delivery restriction. We have kept it in place.':result.pending?'Your email is confirmed. Your choice is saved; we will check the email connection before sending a campaign.':'Your email is confirmed. You are subscribed to UnsaidBox tips, product updates and occasional offers.'};
  } catch {return {error:'This link has expired, has already been used, or could not be confirmed. If you already confirmed, no further action is needed. Otherwise request a new link.'};}
}
