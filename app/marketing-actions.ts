'use server';
import { unstable_rethrow } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAccount, rateLimit } from '@/lib/auth';
import { db } from '@/lib/db';
import { verifyCaptcha } from '@/lib/captcha.mjs';
import { marketingEnabled, consentVersion } from '@/lib/marketing-policy.mjs';
import { saveConsent, syncAccountConsent } from '@/lib/marketing-store.mjs';
import type { Result } from './actions';

export async function saveMarketingConsent(_:Result,form:FormData):Promise<Result> {
  try {
    await verifyCaptcha(form,'saveMarketingConsent');
    if (!marketingEnabled()) return {error:'Marketing email preferences are not available yet.'};
    const account=await requireAccount(false);
    await rateLimit(`marketing-consent:${account.id}`,20,3600);
    const source=form.get('source')==='banner'?'banner':'settings';
    const subscribed=form.get('subscribe')==='on';
    if (form.get('version')!==consentVersion) return {error:'The consent wording changed. Refresh this page before choosing.'};
    if (subscribed && !account.emailVerifiedAt) return {error:'Verify your email before subscribing.'};
    await saveConsent(db(),account.id,subscribed,source);
    let status='pending';
    try {status=await syncAccountConsent(db(),account.id);} catch { /* Local withdrawal is authoritative; sends reconcile the audience. */ }
    revalidatePath('/dashboard','layout');
    return {success:!subscribed?'Your choice is saved. You will not be included in future UnsaidBox marketing campaigns.':status==='blocked'?'Your choice is saved, but Brevo has an unsubscribe or delivery restriction for this address. We have not removed that restriction.':status==='pending'?'Your opt-in is saved. The email connection will be checked before any campaign is sent.':'You are subscribed to UnsaidBox tips, product updates and occasional offers.'};
  } catch(error) {
    unstable_rethrow(error);
    return {error:'Your preference could not be saved. Please try again.'};
  }
}
