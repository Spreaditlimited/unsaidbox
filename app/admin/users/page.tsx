import Link from "next/link";
import { requireAdministrator } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma";
import { adminUserSelect } from "@/lib/admin-data";
import { userFilters, adminPageLink } from "@/lib/admin-filters.mjs";
import { AdminShell } from "@/components/AdminShell";
import { AdminHeading, Pagination, UserTable } from "@/components/AdminUI";
import { Picker } from "@/components/ui/Picker";
import { planMode } from '@/lib/plan-policy.mjs';
import { accountPlanWhere } from '@/lib/admin-entitlements.mjs';

export default async function Users({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const administrator = await requireAdministrator();
  const filters = userFilters(await searchParams);
  const mode = planMode();
  const priceIds = mode && filters.interval ? await db().billingPrice.findMany({ where:{mode,interval:filters.interval},select:{stripePriceId:true} }) : [];
  const subscriptionFilter = mode && (filters.billing || filters.interval) ? {billingCustomers:{some:{mode,subscriptions:{some:{mode,...(filters.billing==='cancelling'?{cancelAtPeriodEnd:true,status:{in:['active','past_due']}}:filters.billing==='attention'?{status:{in:['past_due','unpaid','incomplete']}}:filters.billing?{status:filters.billing}:{}),...(filters.interval?{stripePriceId:{in:priceIds.map(p=>p.stripePriceId)}}:{})}}}}} : {};
  const adoptionFilter = filters.adoption==='forms'?{feedbackForms:{some:{}}}:filters.adoption==='questions'?{questions:{some:{}}}:filters.adoption==='no_links'?{questions:{none:{}},feedbackForms:{none:{}}}:{};
  const where = { AND: [filters.where, accountPlanWhere(mode, filters.plan), subscriptionFilter, adoptionFilter, ...(filters.activity?[{activity:{is:{lastDashboardAt:{gte:new Date(Date.now()-7*86400000)}}}}]:[])] } as Prisma.AccountWhereInput;
  const total = await db().account.count({ where });
  const pages = Math.max(1, Math.ceil(total / 20));
  const page = Math.min(filters.page, pages);
  const orderBy: Prisma.AccountOrderByWithRelationInput[] = filters.sort === "name" ? [{ displayName: "asc" }, { id: "asc" }] : [{ createdAt: filters.sort === "oldest" ? "asc" : "desc" }, { id: "desc" }];
  const users = await db().account.findMany({ where, select: adminUserSelect, orderBy, take: 20, skip: (page - 1) * 20 });
  return <AdminShell name={administrator.displayName}>
    <AdminHeading eyebrow="ACCOUNT MANAGEMENT" title="Users" description="Understand each account, check verification and take considered action." />
    <p className="admin-note">{mode ? `Showing ${mode === 'live' ? 'live' : 'test'} billing entitlements. Enabled accounts are not necessarily recently active users.` : 'Billing is not enabled in this environment. Plan entitlement is unavailable.'}</p>
    <section className="panel admin-filter-panel"><form key={JSON.stringify(filters)} className="admin-filters" method="get" action="/admin/users">
      <label className="admin-search">Search users<input type="search" name="q" defaultValue={filters.q} maxLength={100} placeholder="Name, username or email" /></label>
      {mode && <Picker name="plan" label="Plan entitlement" defaultValue={filters.plan || 'all'} options={[{ value: 'all', label: 'All plans' }, { value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }]} />}
      {mode && <Picker name="billing" label="Subscription state" defaultValue={filters.billing||'all'} options={[{value:'all',label:'All subscription states'},{value:'cancelling',label:'Scheduled to cancel'},{value:'attention',label:'Payment needs attention'},{value:'active',label:'Active subscription'},{value:'canceled',label:'Has cancelled subscription'}]} />}
      {mode && <Picker name="interval" label="Subscription interval (includes history)" defaultValue={filters.interval||'all'} options={[{value:'all',label:'Any interval'},{value:'month',label:'Has monthly subscription record'},{value:'year',label:'Has annual subscription record'}]} />}
      <Picker name="adoption" label="Product adoption" defaultValue={filters.adoption||'all'} options={[{value:'all',label:'Any product usage'},{value:'forms',label:'Has feedback forms'},{value:'questions',label:'Has questions'},{value:'no_links',label:'No questions or forms'}]} />
      <Picker name="activity" label="Recorded activity" defaultValue={filters.activity||'all'} options={[{value:'all',label:'Any activity'},{value:'7days',label:'Dashboard in last 7 days'}]} />
      <Picker name="status" label="Account status" defaultValue={filters.status || "all"} options={[{ value: "all", label: "All statuses" }, { value: "ACTIVE", label: "Active" }, { value: "PENDING", label: "Pending" }, { value: "SUSPENDED", label: "Suspended" }]} />
      <Picker name="verified" label="Email verification" defaultValue={filters.verified || "all"} options={[{ value: "all", label: "All emails" }, { value: "yes", label: "Verified" }, { value: "no", label: "Unverified" }]} />
      <Picker name="sort" label="Sort by" defaultValue={filters.sort} options={[{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }, { value: "name", label: "Name A–Z" }]} />
      <div className="admin-filter-actions"><button className="button" type="submit">Apply filters</button><Link className="button secondary" href="/admin/users">Clear</Link></div>
    </form></section>
    <section className="panel admin-table-panel"><div className="admin-section-title"><h2>User directory</h2><span>{total.toLocaleString("en-GB")} matching accounts</span></div><UserTable users={users} />
      <Pagination page={page} pages={pages} previous={adminPageLink("/admin/users", filters, page - 1)} next={adminPageLink("/admin/users", filters, page + 1)} />
    </section>
  </AdminShell>;
}
