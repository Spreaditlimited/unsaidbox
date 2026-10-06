import Link from "next/link";
import { requireAdministrator } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { adminUserSelect, discoveryQueueWhere } from "@/lib/admin-data";
import { AdminShell } from "@/components/AdminShell";
import { AdminHeading, StatCard, UserTable, adminDate } from "@/components/AdminUI";

export default async function Admin() {
  const administrator = await requireAdministrator();
  const since = new Date(Date.now() - 7 * 86400000);
  const [total, active, pending, suspended, recent, unverified, questions, responses, reports, discovery, latest, events, emailRetries] = await Promise.all([
    db().account.count(), db().account.count({ where: { status: "ACTIVE" } }),
    db().account.count({ where: { status: "PENDING" } }), db().account.count({ where: { status: "SUSPENDED" } }),
    db().account.count({ where: { createdAt: { gte: since } } }), db().account.count({ where: { emailVerifiedAt: null } }),
    db().question.count(), db().submission.count(),
    db().report.count({ where: { status: "OPEN" } }), db().question.count({ where: discoveryQueueWhere }),
    db().account.findMany({ select: adminUserSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 5 }),
    db().auditEvent.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 5, select: { id: true, action: true, createdAt: true } }),
    db().emailDelivery.count({ where: { status: "PENDING", attempts: { gt: 0 } } }),
  ]);
  return <AdminShell name={administrator.displayName}>
    <AdminHeading eyebrow="PLATFORM OVERVIEW" title="Your control centre" description="A clear view of your community, the work waiting for review and account health." />
    <div className="admin-stats">
      <StatCard label="Total users" value={total} detail={`${recent} joined in the last 7 days`} href="/admin/users" />
      <StatCard label="Active accounts" value={active} detail="Accounts enabled to use UnsaidBox" href="/admin/users?status=ACTIVE" />
      <StatCard label="Awaiting activation" value={pending} detail={`${unverified} unverified emails across all accounts`} href="/admin/users?status=PENDING" />
      <StatCard label="Suspended accounts" value={suspended} detail="Access restricted by moderation" href="/admin/users?status=SUSPENDED" />
    </div>
    <div className="admin-two-column">
      <section className="panel"><div className="admin-section-title"><h2>Needs attention</h2><span>Live queues</span></div>
        <Link className="admin-queue" href="/admin/moderation"><span><strong>Open reports</strong><small>Review reports about public content</small></span><b>{reports}</b></Link>
        <Link className="admin-queue" href="/admin/moderation"><span><strong>Explore requests</strong><small>Public questions awaiting discovery approval</small></span><b>{discovery}</b></Link>
        <Link className="admin-queue" href="/admin/users?verified=no"><span><strong>Unverified email addresses</strong><small>Check onboarding progress in the user directory</small></span><b>{unverified}</b></Link>
      </section>
      <section className="panel"><div className="admin-section-title"><h2>Platform activity</h2><span>All time</span></div>
        <div className="admin-mini-stats"><div><strong>{questions.toLocaleString("en-GB")}</strong><span>Questions created</span></div><div><strong>{responses.toLocaleString("en-GB")}</strong><span>Responses collected</span></div></div>
        <p className="admin-note">Totals only. Private questions, anonymous responses and sender identities are not exposed here.</p>
        <p className="admin-note">{emailRetries} queued emails have had a failed attempt. This is a queue count, not a delivery guarantee.</p>
      </section>
    </div>
    <section className="panel admin-table-panel"><div className="admin-section-title"><h2>Recently joined</h2><Link href="/admin/users">View all users →</Link></div><UserTable users={latest} /></section>
    <section className="panel"><div className="admin-section-title"><h2>Recent recorded actions</h2><Link href="/admin/activity">View activity log →</Link></div>
      {events.length ? <ul className="admin-activity">{events.map(event => <li key={event.id}><span>{event.action.replaceAll(":", " · ").replaceAll("_", " ")}</span><time dateTime={event.createdAt.toISOString()}>{adminDate(event.createdAt, true)}</time></li>)}</ul> : <div className="admin-empty"><p>No recorded actions yet.</p></div>}
    </section>
  </AdminShell>;
}
