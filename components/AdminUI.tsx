import Link from "next/link";
import { hasPaidPro } from '@/lib/billing-runtime.mjs';
import { planMode } from '@/lib/plan-policy.mjs';

export function adminDate(value: Date | null, time = false) {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", ...(time ? { timeStyle: "short" as const } : {}), timeZone: "Europe/London" }).format(value) : "Not verified";
}
export function StatusBadge({ status }: { status: string }) {
  return <span className={`admin-badge admin-badge-${status.toLowerCase()}`}>{status.toLowerCase().replaceAll("_", " ")}</span>;
}
export function AdminHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="admin-heading"><div><p className="admin-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div></header>;
}
export function StatCard({ label, value, detail, href }: { label: string; value: number; detail: string; href?: string }) {
  const body = <><span>{label}</span><strong>{value.toLocaleString("en-GB")}</strong><small>{detail}</small></>;
  return href ? <Link className="admin-stat" href={href}>{body}</Link> : <div className="admin-stat">{body}</div>;
}
export function Pagination({ page, pages, previous, next }: { page: number; pages: number; previous: string; next: string }) {
  return <nav className="admin-pagination" aria-label="Pagination"><span>Page {page} of {pages}</span><div>{page > 1 && <Link className="button secondary" href={previous}>Previous</Link>}{page < pages && <Link className="button secondary" href={next}>Next</Link>}</div></nav>;
}
export type AdminUserRow = { id: string; displayName: string; username: string; email: string; emailVerifiedAt: Date | null; status: string; createdAt: Date; activity?: { lastDashboardAt: Date | null } | null; billingCustomers?: { mode: string; subscriptions: { mode: string; status: string; recognized: boolean; paidThrough: Date | null; cancelAtPeriodEnd: boolean }[] }[]; _count: { questions: number; submissions: number; feedbackForms?: number } };
function UserPlan({ user }: { user: AdminUserRow }) {
  const mode = planMode();
  if (!mode) return <span className="admin-cell-detail">Plan unavailable</span>;
  const subscription = user.billingCustomers?.filter(c => c.mode === mode).flatMap(c => c.subscriptions).find(s => s.mode === mode && hasPaidPro(s));
  return <><StatusBadge status={subscription ? 'PRO' : 'FREE'} />{subscription?.cancelAtPeriodEnd && <span className="admin-cell-detail">Cancelling at period end</span>}{subscription?.status === 'past_due' && <span className="admin-cell-detail">Payment needs attention</span>}</>;
}
export function UserTable({ users }: { users: AdminUserRow[] }) {
  if (!users.length) return <div className="admin-empty"><h3>No users found</h3><p>Try a different search or clear your filters.</p></div>;
  return <div className="admin-table-scroll admin-user-directory" role="region" aria-label="User accounts" tabIndex={0}><table className="admin-table" role="table"><thead><tr><th scope="col">User</th><th scope="col">Status</th><th scope="col">Verification</th><th scope="col">Usage</th><th scope="col">Joined</th><th scope="col">Account</th></tr></thead><tbody>{users.map(u => <tr key={u.id} role="row">
    <td data-label="User" role="cell"><Link className="admin-user-name" href={`/admin/users/${u.id}`}>{u.displayName}</Link><span className="admin-cell-detail">@{u.username}</span><span className="admin-cell-detail">{u.email}</span></td>
    <td data-label="Status & plan" role="cell"><StatusBadge status={u.status} /><UserPlan user={u} /></td><td data-label="Verification" role="cell"><StatusBadge status={u.emailVerifiedAt ? "VERIFIED" : "UNVERIFIED"} /></td>
    <td data-label="Usage" role="cell">{u._count.questions} questions · {u._count.feedbackForms ?? 0} forms<span className="admin-cell-detail">{u._count.submissions} inbox/question responses</span><span className="admin-cell-detail">Dashboard: {u.activity?.lastDashboardAt ? adminDate(u.activity.lastDashboardAt, true) : 'Not recorded'}</span></td><td data-label="Joined" role="cell">{adminDate(u.createdAt)}</td>
    <td data-label="Account" role="cell"><Link className="button secondary" href={`/admin/users/${u.id}`} aria-label={`View ${u.displayName}'s account`}>View user</Link></td>
  </tr>)}</tbody></table></div>;
}
