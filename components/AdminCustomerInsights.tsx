import { db } from '@/lib/db';
import { accountPlan, usageSummary } from '@/lib/plans';
import { planMode } from '@/lib/plan-policy.mjs';
import { adminDate, StatusBadge } from './AdminUI';
import { ActionForm } from './ActionForm';
import { addCustomerNote } from '@/app/admin/customer-notes';
import { repairCustomerAllowance } from '@/app/admin/allowance-actions';

// Server-only metadata. Never select private response bodies or session tokens.
export async function AdminCustomerInsights({ accountId }: { accountId: string }) {
  const plan = await accountPlan(accountId);
  // A missing anniversary is a synchronization issue, not zero usage.
  const usage = plan.key === 'pro' && !plan.allowanceAnchor ? null : await usageSummary(accountId);
  const mode = planMode();
  const activity = await db().accountActivity.findUnique({where:{accountId},select:{lastLoginAt:true,lastDashboardAt:true,firstQuestionAt:true,firstFormAt:true,firstResponseAt:true}});
  const history = mode ? await db().billingHistory.findMany({where:{mode,customer:{accountId,mode}},orderBy:[{recordedAt:'desc'},{id:'desc'}],take:20,select:{id:true,eventType:true,status:true,occurredAt:true,recordedAt:true}}) : [];
  const forms = await db().feedbackForm.count({ where: { accountId } });
  const notes = await db().administratorCustomerNote.findMany({ where: { accountId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 20, select: { id: true, body: true, createdAt: true, administrator: { select: { displayName: true } } } });
  const entries = await db().feedbackEntry.count({ where: { form: { accountId } } });
  const questions = await db().question.count({ where: { accountId, linkActive: true, acceptingResponses: true } });
  const collecting = await db().feedbackForm.count({ where: { accountId, linkActive: true, acceptingResponses: true, blocked: false } });
  const followups = await db().followupConversation.count({ where: { accountId } });
  const identities = await db().socialIdentity.findMany({ where: { accountId }, select: { provider: true } });
  const customer = mode ? await db().billingCustomer.findUnique({ where: { accountId_mode: { accountId, mode } }, select: { stripeCustomerId: true, subscriptions: { where: { mode }, select: { id: true, status: true, recognized: true, cancelAtPeriodEnd: true, paidThrough: true, periodEnd: true, syncedAt: true }, orderBy: { syncedAt: 'desc' }, take: 10 } } }) : null;
  return <div className="admin-two-column">
    <section className="panel"><h2>Plan & allowance</h2>
      <p>{plan.enforced ? <StatusBadge status={plan.key} /> : 'Billing entitlement unavailable'}{mode ? ` · ${mode} environment` : ''}</p>
      <dl className="admin-details">
        <div><dt>Responses this allowance period</dt><dd>{usage ? `${usage.used.toLocaleString('en-GB')} / ${usage.limit.toLocaleString('en-GB')}` : plan.enforced?'Awaiting verified allowance dates':'Billing is disabled in this environment'}</dd></div>
        <div><dt>Next allowance reset</dt><dd>{usage ? adminDate(usage.resetsAt, true) : 'Not yet available'}</dd></div>
        <div><dt>Active questions</dt><dd>{questions} / {plan.limits.questions}</dd></div>
        <div><dt>Collecting forms</dt><dd>{collecting} / {plan.limits.forms}</dd></div>
      </dl>
      {plan.key==='pro'&&!plan.allowanceAnchor&&<div className="admin-allowance-recovery"><p className="admin-note">This subscription is missing its saved allowance start date. Restore it from Stripe to show usage and the correct monthly reset. Existing responses and usage counters stay unchanged.</p><ActionForm action={repairCustomerAllowance.bind(null,accountId)} captchaAction="repairCustomerAllowance" label="Restore allowance dates"><span className="fine">Checks this account in the {mode} environment. Does not create a payment or alter the subscription.</span></ActionForm></div>}
      <p className="admin-note">Usage can exceed retained responses because deleting content does not refund the allowance. Link limits are concurrent, not monthly.</p>
      {customer?.stripeCustomerId && /^cus_[A-Za-z0-9]+$/.test(customer.stripeCustomerId) && <a className="button secondary" href={`https://dashboard.stripe.com/${mode === 'test' ? 'test/' : ''}customers/${customer.stripeCustomerId}`} target="_blank" rel="noopener noreferrer">View Stripe customer ↗</a>}
      {customer?.subscriptions.map(s => <dl className="admin-details" key={s.id}>
        <div><dt>Subscription status</dt><dd>{s.status}{s.cancelAtPeriodEnd ? ' · cancels at period end' : ''}{!s.recognized ? ' · unrecognised price' : ''}</dd></div>
        <div><dt>Paid through</dt><dd>{s.paidThrough ? adminDate(s.paidThrough, true) : 'Not recorded'}</dd></div>
        <div><dt>Billing period ends</dt><dd>{s.periodEnd ? adminDate(s.periodEnd, true) : 'Not recorded'}</dd></div>
        <div><dt>Last synced</dt><dd>{adminDate(s.syncedAt, true)}</dd></div>
      </dl>)}
    </section>
    <section className="panel"><h2>Product adoption</h2><dl className="admin-details">
      <div><dt>Last recorded sign-in</dt><dd>{activity?.lastLoginAt?adminDate(activity.lastLoginAt,true):'Not recorded'}</dd></div>
      <div><dt>Last recorded dashboard visit</dt><dd>{activity?.lastDashboardAt?adminDate(activity.lastDashboardAt,true):'Not recorded'}</dd></div>
      <div><dt>First observed question creation</dt><dd>{activity?.firstQuestionAt?adminDate(activity.firstQuestionAt,true):'Not recorded'}</dd></div>
      <div><dt>First observed form creation</dt><dd>{activity?.firstFormAt?adminDate(activity.firstFormAt,true):'Not recorded'}</dd></div>
      <div><dt>First observed response received</dt><dd>{activity?.firstResponseAt?adminDate(activity.firstResponseAt,true):'Not recorded'}</dd></div>
      <div><dt>Forms created</dt><dd>{forms}</dd></div>
      <div><dt>Retained form submissions</dt><dd>{entries}</dd></div>
      <div><dt>Private follow-up conversations</dt><dd>{followups}</dd></div>
      <div><dt>Linked sign-in providers</dt><dd>{identities.map(i => i.provider).join(', ') || 'None linked'}</dd></div>
    </dl><p className="admin-note">Milestones begin when tracking is enabled, not necessarily at the account’s first-ever action. Dashboard activity is recorded at most once per five minutes. Counts only: anonymous answers and private conversation contents are not exposed to administrators.</p></section>
    <section className="panel"><h2>Billing history</h2><p className="admin-note">Latest 20 received events in this environment. Status is the verified state at synchronisation, not a reconstruction of the event’s original state. History begins when recording is enabled; this is not a revenue ledger.</p>
      {!history.length&&<p className="admin-note">No recorded billing events yet.</p>}
      <ol className="admin-activity">{history.map(event=><li key={event.id}><div><strong>{event.eventType.replaceAll('.',' · ')}</strong><small>Verified status: {event.status||'Not recorded'}</small><small>Provider event: {adminDate(event.occurredAt,true)}</small></div><time dateTime={event.recordedAt.toISOString()}>Recorded {adminDate(event.recordedAt,true)}</time></li>)}</ol>
    </section>
    <section className="panel"><h2>Internal support notes</h2><p className="admin-note">Visible to administrators only. Do not copy private anonymous responses, credentials or payment details here. Showing the latest 20 notes.</p>
      <ActionForm action={addCustomerNote.bind(null,accountId)} captchaAction="addCustomerNote" label="Add support note"><label>Note<textarea name="body" maxLength={3000} rows={3} required /></label></ActionForm>
      {notes.map(note=><article key={note.id}><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{note.body}</p><small>{note.administrator.displayName} · {adminDate(note.createdAt,true)}</small></article>)}
    </section>
  </div>;
}
