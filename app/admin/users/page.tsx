import Link from "next/link";
import { requireAdministrator } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma";
import { adminUserSelect } from "@/lib/admin-data";
import { userFilters, adminPageLink } from "@/lib/admin-filters.mjs";
import { AdminShell } from "@/components/AdminShell";
import { AdminHeading, Pagination, UserTable } from "@/components/AdminUI";
import { Picker } from "@/components/ui/Picker";

export default async function Users({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const administrator = await requireAdministrator();
  const filters = userFilters(await searchParams);
  const where = filters.where as Prisma.AccountWhereInput;
  const total = await db().account.count({ where });
  const pages = Math.max(1, Math.ceil(total / 20));
  const page = Math.min(filters.page, pages);
  const orderBy: Prisma.AccountOrderByWithRelationInput[] = filters.sort === "name" ? [{ displayName: "asc" }, { id: "asc" }] : [{ createdAt: filters.sort === "oldest" ? "asc" : "desc" }, { id: "desc" }];
  const users = await db().account.findMany({ where, select: adminUserSelect, orderBy, take: 20, skip: (page - 1) * 20 });
  return <AdminShell name={administrator.displayName}>
    <AdminHeading eyebrow="ACCOUNT MANAGEMENT" title="Users" description="Understand each account, check verification and take considered action." />
    <section className="panel admin-filter-panel"><form key={JSON.stringify([filters.q, filters.status, filters.verified, filters.sort])} className="admin-filters" method="get" action="/admin/users">
      <label className="admin-search">Search users<input type="search" name="q" defaultValue={filters.q} maxLength={100} placeholder="Name, username or email" /></label>
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
