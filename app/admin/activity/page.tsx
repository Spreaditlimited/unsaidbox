import Link from "next/link";
import { requireAdministrator } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/AdminShell";
import { AdminHeading, Pagination, adminDate } from "@/components/AdminUI";
import { userFilters } from "@/lib/admin-filters.mjs";

export default async function Activity({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const administrator = await requireAdministrator();
  const total = await db().auditEvent.count();
  const pages = Math.max(1, Math.ceil(total / 30));
  const page = Math.min(userFilters(await searchParams).page, pages);
  const events = await db().auditEvent.findMany({ take: 30, skip: (page - 1) * 30, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, actorId: true, targetId: true, action: true, createdAt: true } });
  const ids = [...new Set(events.flatMap(e => [e.actorId, e.targetId]))];
  const [admins, users] = await Promise.all([
    db().administrator.findMany({ where: { id: { in: ids } }, select: { id: true, displayName: true } }),
    db().account.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } }),
  ]);
  const adminNames = new Map(admins.map(a => [a.id, a.displayName]));
  const userNames = new Map(users.map(u => [u.id, u.username]));
  return <AdminShell name={administrator.displayName}>
    <AdminHeading eyebrow="ACCOUNTABILITY" title="Activity log" description="A chronological record of saved administrative and account actions. Times shown in Europe/London." />
    <section className="panel admin-table-panel"><div className="admin-section-title"><h2>Recorded actions</h2><span>{total.toLocaleString("en-GB")} events</span></div>
      {events.length ? <div className="admin-table-scroll" role="region" aria-label="Recorded actions" tabIndex={0}><table className="admin-table"><thead><tr><th scope="col">When</th><th scope="col">Actor</th><th scope="col">Action</th><th scope="col">Target</th></tr></thead><tbody>{events.map(e => <tr key={e.id}><td>{adminDate(e.createdAt, true)}</td><td>{adminNames.has(e.actorId) ? `${adminNames.get(e.actorId)} (administrator)` : userNames.has(e.actorId) ? `@${userNames.get(e.actorId)} (account)` : "Historical actor"}</td><td>{e.action.replaceAll(":", " · ").replaceAll("_", " ")}</td><td>{userNames.has(e.targetId) ? <Link href={`/admin/users/${e.targetId}`}>@{userNames.get(e.targetId)}</Link> : <code>{e.targetId}</code>}</td></tr>)}</tbody></table></div> : <div className="admin-empty">No recorded actions yet.</div>}
      <Pagination page={page} pages={pages} previous={`/admin/activity?page=${page - 1}`} next={`/admin/activity?page=${page + 1}`} />
    </section>
  </AdminShell>;
}
