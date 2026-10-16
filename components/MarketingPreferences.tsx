import Link from 'next/link';
import { ActionForm } from './ActionForm';
import { Checkbox } from './ui/Checkbox';
import { saveMarketingConsent } from '@/app/marketing-actions';
import { consentStatement, consentVersion, marketingEnabled } from '@/lib/marketing-policy.mjs';
import { db } from '@/lib/db';
import { leadEnabled } from '@/lib/lead-policy.mjs';

export async function MarketingPreferences({accountId,banner=false}:{accountId:string;banner?:boolean}) {
  if (!marketingEnabled()) return null;
  const account=await db().account.findUnique({where:{id:accountId},select:{email:true,emailVerifiedAt:true,status:true,marketingConsent:true}});
  const lead=account?.emailVerifiedAt&&leadEnabled()?await db().marketingLead.findUnique({where:{email:account.email.toLowerCase()}}):null;
  if (!account || (banner && (!account.emailVerifiedAt || account.status!=='ACTIVE' || account.marketingConsent || lead?.confirmedAt))) return null;
  if (banner) return <section className="marketing-invitation" aria-labelledby="digest-invitation-title">
    <div className="marketing-invitation-copy">
      <span className="marketing-invitation-kicker">THE UNSAIDBOX SUNDAY READ</span>
      <h2 id="digest-invitation-title">A better question for<br/>the week ahead.</h2>
      <p>Fresh ideas from our blog, practical feedback tips and a little inspiration for your box.</p>
      <span className="marketing-invitation-schedule"><span aria-hidden="true">◷</span> Sundays · 6pm UK time</span>
    </div>
    <div className="marketing-invitation-choice">
      <h3>Make a little room in your inbox</h3>
      <p>Join the weekly digest, with product updates and occasional offers along the way.</p>
      <ActionForm action={saveMarketingConsent} captchaAction="saveMarketingConsent" label="Save my email preference">
        <input type="hidden" name="source" value="banner"/>
        <input type="hidden" name="version" value={consentVersion}/>
        <Checkbox name="subscribe">{consentStatement}</Checkbox>
        <p className="fine">Leave this unchecked and save to decline. You can change your choice in Settings anytime.</p>
      </ActionForm>
      <p className="marketing-invitation-footer">Optional. Separate from inbox notifications. <Link href="/safety">Privacy &amp; safety</Link></p>
    </div>
  </section>;
  return <section className="panel editor-panel dashboard-section">
    <h2>{banner?'Better questions. More useful feedback.':'Marketing emails'}</h2>
    <p>Get our weekly blog digest on Sundays at 6pm UK time, plus practical tips, new feature updates and occasional offers. This is optional and separate from inbox notifications.</p>
    <ActionForm action={saveMarketingConsent} captchaAction="saveMarketingConsent" label={banner?'Save my choice':'Save marketing preference'}>
      <input type="hidden" name="source" value={banner?'banner':'settings'}/>
      <input type="hidden" name="version" value={consentVersion}/>
      <Checkbox name="subscribe" defaultChecked={account.marketingConsent?.subscribed??Boolean(lead?.subscribed&&lead.confirmedAt)} disabled={!account.emailVerifiedAt}>{consentStatement}</Checkbox>
      <p className="fine">{!account.emailVerifiedAt?'Verify your email to subscribe. ':''}{banner?'Leave this unchecked and save to decline. ':''}Unsubscribe here or through an email footer. <Link href="/safety">Privacy &amp; safety</Link></p>
    </ActionForm>
  </section>;
}
