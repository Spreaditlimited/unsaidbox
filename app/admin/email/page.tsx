import Link from 'next/link';
import { requireAdministrator } from '@/lib/admin-auth';
import { AdminShell } from '@/components/AdminShell';
import { ActionForm } from '@/components/ActionForm';
import { Checkbox } from '@/components/ui/Checkbox';
import { db } from '@/lib/db';
import { marketingEnabled, renderCampaign } from '@/lib/marketing-policy.mjs';
import { createMarketingDraft, testMarketingDraft, sendMarketingDraft } from './actions';
import {marketingSegments} from '@/lib/marketing-segments.mjs';
import { leadEnabled } from '@/lib/lead-policy.mjs';

export const dynamic='force-dynamic';
export const maxDuration=300;
export default async function EmailAdmin() {
  const admin=await requireAdministrator();
  if (!marketingEnabled()) return <AdminShell name={admin.displayName}><h1>Email marketing</h1><section className="panel"><h2>Brevo setup is being completed</h2><p>UnsaidBox marketing remains switched off until its dedicated audience, authenticated sender and consent tables are ready.</p></section></AdminShell>;
  const [count,campaigns,leadCount]=await Promise.all([
    db().marketingConsent.count({where:{subscribed:true,account:{status:'ACTIVE',emailVerifiedAt:{not:null}}}}),
    db().marketingCampaign.findMany({orderBy:{createdAt:'desc'},take:25}),
    leadEnabled()?db().marketingLead.count({where:{subscribed:true,confirmedAt:{not:null}}}):Promise.resolve(0),
  ]);
  const segments=await marketingSegments(db());
  const address=process.env.UNSAIDBOX_MARKETING_POSTAL_ADDRESS;
  return <AdminShell name={admin.displayName}>
    <h1>Email marketing</h1>
    <p>UnsaidBox tips, product updates and offers, sent through Brevo.</p>
    <section className="panel"><h2>{count} verified accounts opted in</h2><p>{leadCount} confirmed public email signups. These counts can overlap; each email address is included at most once in a campaign.</p><p>Brevo unsubscribes, account withdrawals and delivery restrictions may reduce the eligible audience. Anonymous submissions never subscribe anyone.</p><p>Sender: hello@unsaidbox.com · <Link href="https://app.brevo.com/">Open Brevo for delivery reports</Link></p></section>
    <section className="panel dashboard-section"><h2>Who’s subscribed?</h2>
      <p>{segments.total} distinct locally opted-in addresses. Provider unsubscribes and delivery restrictions can reduce the send audience.</p>
      <ul><li>{segments.counts.NO_ACCOUNT} readers without an account</li><li>{segments.counts.NO_QUESTION} verified account holders with no questions</li><li>{segments.counts.HAS_QUESTION} verified account holders with questions</li><li>{segments.counts.VERIFY_EMAIL} account holders awaiting email verification</li></ul>
      <h3>Readers without accounts</h3><p className="fine">Confirmed email signups only. Pending confirmations are excluded. Showing the latest 100. Account matches update automatically.</p>
      {segments.withoutAccounts.length?<div style={{overflowX:'auto'}}><table><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Confirmed</th></tr></thead><tbody>{segments.withoutAccounts.map((lead:{email:string;firstName:string;confirmedAt:Date})=><tr key={lead.email}><td>{lead.firstName}</td><td>{lead.email}</td><td>{lead.confirmedAt.toISOString().slice(0,10)}</td></tr>)}</tbody></table></div>:<p>No confirmed subscribers without accounts yet.</p>}
      <p className="fine">The Sunday email focuses on one blog post. Only verified account holders with no current questions see the invitation to reply for help. All replies go to hello@unsaidbox.com.</p>
    </section>
    <section className="panel dashboard-section editor-panel"><h2>Write an email</h2>
      <ActionForm action={createMarketingDraft} captchaAction="createMarketingDraft" label="Save draft">
        <label>Subject<input name="subject" required maxLength={200}/></label>
        <label>Inbox preview text<input name="preheader" maxLength={200}/></label>
        <label>Heading<input name="heading" required maxLength={200}/></label>
        <label>Message<textarea name="body" rows={10} required maxLength={12000}/></label>
        <p className="fine">Write plain text with blank lines between paragraphs. The branded template includes an UnsaidBox button, your business address, preferences and unsubscribe links. Do not include private submissions.</p>
      </ActionForm>
    </section>
    <h2>Drafts &amp; recent campaigns</h2>
    {!campaigns.length?<p>No campaigns yet. Create a draft above.</p>:null}
    {campaigns.map(c=><section key={c.id} className="panel dashboard-section">
      <h3>{c.subject}</h3><p>Status: {c.status} · Created {c.createdAt.toISOString().slice(0,10)}{c.recipientCount!==null?` · ${c.recipientCount} eligible recipients at submission`:''}{c.providerId?` · Brevo campaign ${c.providerId}`:''}</p>
      {address?<iframe title={`Email preview: ${c.subject}`} sandbox="" srcDoc={renderCampaign(c,address)} style={{width:'100%',height:620,border:'1px solid var(--line)',borderRadius:14,background:'var(--paper)'}}/>:<p className="notice">Configure the business postal address to preview and send.</p>}
      {c.status==='DRAFT'?<>
        <ActionForm action={testMarketingDraft} captchaAction="testMarketingDraft" label="Send test to our mailbox"><input type="hidden" name="id" value={c.id}/><p className="fine">Test recipient: hello@unsaidbox.com. Check the test in your inbox before sending to subscribers.</p></ActionForm>
        <ActionForm action={sendMarketingDraft} captchaAction="sendMarketingDraft" label="Send to opted-in audience"><input type="hidden" name="id" value={c.id}/><Checkbox name="reviewed" required>I reviewed this exact draft and approve sending it to eligible UnsaidBox subscribers.</Checkbox><label>Type SEND to confirm<input name="confirm" autoComplete="off" required pattern="SEND"/></label><p className="fine">Recipients and Brevo restrictions are checked immediately before submission. Sending cannot be undone.</p></ActionForm>
      </>:c.status==='ACCEPTED'?<p>Accepted for processing. Check Brevo for delivery, bounce and unsubscribe results.</p>:<p className="notice">Review this campaign in Brevo before taking further action. This campaign will not be resubmitted automatically.</p>}
    </section>)}
  </AdminShell>;
}
