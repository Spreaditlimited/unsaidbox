import Link from "next/link";
import { requireAdministrator } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { blogListQuery, blogStatus } from "@/lib/blog-policy.mjs";
import { blogImageUrl } from "@/lib/blog";
import { AdminShell } from "@/components/AdminShell";
import { AdminHeading, Pagination } from "@/components/AdminUI";
import { Picker } from "@/components/ui/Picker";
import { BlogImageControl } from "@/components/blog/BlogImageControl";
export const dynamic = "force-dynamic";
export default async function BlogAdmin({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const admin = await requireAdministrator();
  const query = blogListQuery(await searchParams);
  const total = await db().blogPost.count({ where: query.where });
  const pages = Math.max(1, Math.ceil(total / 20));
  const page = Math.min(pages, query.page);
  const posts = await db().blogPost.findMany({ where: query.where, orderBy: [{ publishAt: "desc" }, { createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 20, take: 20, select: { id: true, title: true, slug: true, category: true, published: true, publishAt: true, createdAt: true, image: { select: { version: true } } } });
  const canGenerate = Boolean(process.env.UNSAIDBOX_OPENAI_API_KEY && process.env.UNSAIDBOX_OPENAI_IMAGE_MODEL);
  const href = (p: number) => `/admin/blog?${new URLSearchParams({ q: query.search, status: query.status, page: String(p) })}`;
  return <AdminShell name={admin.displayName}>
    <div className="blog-admin-heading"><AdminHeading eyebrow="Content and growth" title="Blog" description="Helpful articles that turn curious readers into confident creators." /><Link className="button" href="/admin/blog/new">New article</Link></div>
    <section className="panel">
      <form className="blog-filters"><label>Search articles<input name="q" defaultValue={query.search} placeholder="Title or URL slug" /></label><Picker name="status" label="Status" key={query.status} defaultValue={query.status || "ALL"} options={[{ value: "ALL", label: "All articles" }, { value: "DRAFT", label: "Drafts" }, { value: "SCHEDULED", label: "Scheduled" }, { value: "PUBLISHED", label: "Published" }]} /><button className="button secondary">Search</button></form>
      <p className="fine">{total} articles · newest publication / scheduled date first. Dates shown in UTC.</p>
      {!canGenerate && <p className="fine">Image generation needs a dedicated UnsaidBox OpenAI key and model. Manual cover uploads are available in each article.</p>}
    </section>
    <div className="blog-admin-list">{posts.map(post => {
      const image = blogImageUrl(post, true);
      return <article className="panel blog-admin-row" key={post.id}>
        <div className="blog-thumb">{image ? <img src={image} alt="" loading="lazy" /> : <span>No cover yet</span>}</div>
        <div className="blog-row-content"><span className="badge">{blogStatus(post)}</span><h2><Link href={`/admin/blog/${post.id}`}>{post.title}</Link></h2><p className="fine">{post.category} · {post.publishAt ? post.publishAt.toISOString().slice(0, 16).replace("T", " ") : `Created ${post.createdAt.toISOString().slice(0, 10)}`}</p><p className="fine">/blog/{post.slug}</p></div>
        <div className="response-actions"><BlogImageControl id={post.id} title={post.title} canGenerate={canGenerate} compact /><Link className="button secondary" href={`/admin/blog/${post.id}`}>Edit</Link><Link className="button secondary" href={`/admin/blog/${post.id}/preview`}>Preview</Link></div>
      </article>;
    })}</div>
    {!posts.length && <section className="panel"><h2>{query.search || query.status ? "No matching articles" : "Your first article starts here"}</h2><p>{query.search || query.status ? "Try another search or status." : "Save a draft, add a cover and review it before publishing."}</p></section>}
    <Pagination page={page} pages={pages} previous={href(page - 1)} next={href(page + 1)} />
  </AdminShell>;
}
