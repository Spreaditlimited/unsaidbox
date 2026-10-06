import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdministrator } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { adminUserSelect } from "@/lib/admin-data";
import { AdminShell } from "@/components/AdminShell";
import { AdminHeading, StatCard, StatusBadge, adminDate } from "@/components/AdminUI";
import { AdminAccountActions } from "@/components/AdminAccountActions";

export default async function UserDetails({ params }: { params: Promise<{ id: string }> }) {
  const administrator = await requireAdministrator();
  const { id } = await params;
  const user = await db().account.findUnique({ where: { id }, select: { ...adminUserSelect, updatedAt: true, publicPageEnabled: true, inboxOpen: true, inboxSharingPolicy: true, emailPreference: { select: { newMessages: true } } } });
  if (!user) notFound();
  const [sessions, publicQuestions, pendingResponses, events, deliveries] = await Promise.all([
    db().session.count({ where: { accountId: id, expiresAt: { gt: new Date() } } }),
    db().question.count({ where: { accountId: id, publicVisible: true, linkActive: true } }),
    db().submission.count({ where: { accountId: id, status: "PENDING" } }),
    db().auditEvent.findMany({ where: { targetId: id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 10, select: { id: true, action: true, createdAt: true } }),
    db().emailDelivery.findMany({ where: { accountId: id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 5, select: { id: true, kind: true, status: true, createdAt: true, attempts: true } }),
  ]);
  return <AdminShell name={administrator.displayName}>
    <Link className="admin-back" href="/admin/users">← All users</Link>
    <AdminHeading eyebrow={`USER ACCOUNT · @${user.username}`} title={user.displayName} description="Account information and support controls. Private inbox content is never shown." />
    <div className="admin-detail-banner"><span>{user.email}</span><StatusBadge status={user.status} /><StatusBadge status={user.emailVerifiedAt ? "VERIFIED" : "UNVERIFIED"} /></div>
    <div className="admin-stats"><StatCard label="Questions created" value={user._count.questions} detail={`${publicQuestions} marked public with an active link`} /><StatCard label="Responses received" value={user._count.submissions} detail={`${pendingResponses} awaiting owner review`} /><StatCard label="Valid login sessions" value={sessions} detail="Unexpired sessions; not an online indicator" /></div>
    <div className="admin-two-column">
      <section className="panel"><h2>Account details</h2><dl className="admin-details">
        <div><dt>Display name</dt><dd>{user.displayName}</dd></div><div><dt>Username</dt><dd>@{user.username}</dd></div><div><dt>Email address</dt><dd><a href={`mailto:${user.email}`}>{user.email}</a></dd></div>
        <div><dt>Joined</dt><dd>{adminDate(user.createdAt, true)}</dd></div><div><dt>Account last updated</dt><dd>{adminDate(user.updatedAt, true)}</dd></div><div><dt>Email verified</dt><dd>{adminDate(user.emailVerifiedAt, true)}</dd></div><div><dt>Account ID</dt><dd><code>{user.id}</code></dd></div>
      </dl></section>
      <section className="panel"><h2>Box & privacy settings</h2><dl className="admin-details">
        <div><dt>Public page</dt><dd>{user.publicPageEnabled ? "Enabled by owner" : "Private"}</dd></div><div><dt>Inbox setting</dt><dd>{user.inboxOpen ? "Open" : "Closed"}</dd></div><div><dt>Message sharing</dt><dd>{user.inboxSharingPolicy === "PRIVATE_ONLY" ? "Private only" : "Owner may share"}</dd></div><div><dt>Message email alerts</dt><dd>{user.emailPreference?.newMessages ? "Opted in" : "Off"}</dd></div>
      </dl><p className="admin-note">Collection and public access also depend on account status. A suspended or pending account cannot collect new messages.</p>
      {user.status === "ACTIVE" && user.publicPageEnabled && <Link className="button secondary" href={`/u/${user.username}`} target="_blank" rel="noopener noreferrer">View public page ↗</Link>}
      </section>
    </div>
    <section className="panel"><h2>Account controls</h2><p className="admin-note">Changes are recorded against your administrator account. These controls do not expose passwords, impersonate the user or change their publication choices.</p><AdminAccountActions id={id} username={user.username} status={user.status} /></section>
    <div className="admin-two-column">
      <section className="panel"><h2>Recent email activity</h2><p className="admin-note">Last five queue records. SMTP acceptance does not confirm inbox delivery. Email contents and reset links are excluded.</p>
        {deliveries.length ? <ul className="admin-activity">{deliveries.map(d => <li key={d.id}><span>{d.kind.toLowerCase().replaceAll("_", " ")}<small>{adminDate(d.createdAt, true)} · {d.attempts} attempts</small></span><StatusBadge status={d.status} /></li>)}</ul> : <p className="admin-empty">No email queue records for this user.</p>}
      </section>
      <section className="panel"><h2>Account action history</h2><p className="admin-note">Last ten recorded actions targeting this account. This is not a browsing or login history.</p>
        {events.length ? <ul className="admin-activity">{events.map(e => <li key={e.id}><span>{e.action.replaceAll(":", " · ").replaceAll("_", " ")}</span><time dateTime={e.createdAt.toISOString()}>{adminDate(e.createdAt, true)}</time></li>)}</ul> : <p className="admin-empty">No account actions recorded yet.</p>}
      </section>
    </div>
  </AdminShell>;
}
