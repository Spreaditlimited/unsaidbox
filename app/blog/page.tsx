import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { db } from "@/lib/db";
import { publicBlogWhere, blogOrigin, blogCategories } from "@/lib/blog-policy.mjs";
import { blogImageUrl } from "@/lib/blog";
import { socialMetadata, blogSocialImage } from "@/lib/social-metadata";
export const dynamic = "force-dynamic";
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ page?: string; category?: string }> }): Promise<Metadata> {
  const p = await searchParams;
  const query = new URLSearchParams();
  if (p.category && blogCategories.includes(p.category)) query.set("category", p.category);
  if (Number(p.page) > 1) query.set("page", String(Number.parseInt(p.page!, 10)));
  const title = "Blog — Better questions, honest answers";
  const description = "Practical guides, question ideas and thoughtful ways to connect with your audience using anonymous feedback.";
  const url = `${blogOrigin}/blog${query.size ? `?${query}` : ""}`;
  return { title, description, robots: { index: !query.size, follow: true }, alternates: { canonical: url }, ...socialMetadata({ title, description, url, image: blogSocialImage }) };
}
export default async function Blog({ searchParams }: { searchParams: Promise<{ page?: string; category?: string }> }) {
  const params = await searchParams;
  const category = blogCategories.includes(params.category || "") ? params.category : undefined;
  const where = { ...publicBlogWhere(), ...(category ? { category } : {}) };
  const total = await db().blogPost.count({ where });
  const pages = Math.max(1, Math.ceil(total / 9));
  const page = Math.min(pages, Math.max(1, Number.parseInt(params.page || "1", 10) || 1));
  const posts = await db().blogPost.findMany({ where, orderBy: [{ publishAt: "desc" }, { id: "desc" }], skip: (page - 1) * 9, take: 9, select: { id: true, slug: true, title: true, excerpt: true, imageAlt: true, category: true, publishAt: true, image: { select: { version: true } } } });
  const pageHref = (p: number) => `/blog?${new URLSearchParams({ page: String(p), ...(category ? { category } : {}) })}`;
  return <SiteShell><section className="blog-intro wrap"><p className="eyebrow">The UnsaidBox journal</p><h1>Better questions.<br /><em>More honest answers.</em></h1><p>Ideas and practical guides for creators who want to listen, connect and share with intention.</p></section>
    <section className="wrap blog-list-section"><nav className="blog-categories" aria-label="Blog categories"><Link href="/blog" aria-current={!category ? "page" : undefined}>All articles</Link>{blogCategories.map(c => <Link key={c} href={`/blog?category=${encodeURIComponent(c)}`} aria-current={category === c ? "page" : undefined}>{c}</Link>)}</nav>
      <div className="blog-grid">{posts.map(post => { const image = blogImageUrl(post); return <article className="blog-card" key={post.id}><Link href={`/blog/${post.slug}`} tabIndex={-1} aria-hidden="true">{image ? <img src={image} alt="" width={1600} height={900} loading="lazy" /> : <div className="blog-card-art" aria-hidden="true">A place for the unsaid.</div>}</Link><div className="blog-card-copy"><p className="eyebrow">{post.category}</p><h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2><p>{post.excerpt}</p><time className="fine" dateTime={post.publishAt!.toISOString()}>{post.publishAt!.toLocaleDateString("en-GB", { dateStyle: "long", timeZone: "UTC" })}</time></div></article>; })}</div>
      {!posts.length && <div className="panel"><h2>{category ? "No articles in this category yet" : "Good conversations are on the way"}</h2><p>Our guides will appear here as they are published.</p><Link className="button" href="/start">Create your box</Link></div>}
      {pages > 1 && <nav className="action-row" aria-label="Blog pagination">{page > 1 && <Link className="button secondary" href={pageHref(page - 1)}>Previous</Link>}<span>Page {page} of {pages}</span>{page < pages && <Link className="button secondary" href={pageHref(page + 1)}>Next</Link>}</nav>}
    </section></SiteShell>;
}
