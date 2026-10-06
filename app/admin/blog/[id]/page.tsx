import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdministrator } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { blogCategories, blogStatus } from "@/lib/blog-policy.mjs";
import { blogImageUrl } from "@/lib/blog";
import { AdminShell } from "@/components/AdminShell";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { BlogImageControl } from "@/components/blog/BlogImageControl";
import { DeleteForm } from "@/components/ActionForm";
import { deleteBlog } from "../actions";
export default async function EditArticle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const admin = await requireAdministrator();
  const { id } = await params;
  const post = await db().blogPost.findUnique({ where: { id }, include: { image: { select: { version: true } } } });
  if (!post) notFound();
  const image = blogImageUrl(post, true);
  return <AdminShell name={admin.displayName}>
    <Link href="/admin/blog" className="text-link">← All articles</Link><h1>Edit article</h1>
    <div className="action-row"><span className="badge">{blogStatus(post)}</span><Link className="button secondary" href={`/admin/blog/${id}/preview`}>Preview saved article</Link>{blogStatus(post) === "PUBLISHED" && <Link className="button secondary" href={`/blog/${post.slug}`}>View public article</Link>}</div>
    {(await searchParams).saved && <p className="action-status" role="status">Article saved.</p>}
    <BlogEditor key={`${post.id}-${post.revision}`} categories={blogCategories} post={{ id: post.id, revision: post.revision, title: post.title, slug: post.slug, excerpt: post.excerpt, contentHtml: post.contentHtml, authorName: post.authorName, category: post.category, seoTitle: post.seoTitle, seoDescription: post.seoDescription, imageAlt: post.imageAlt, published: post.published, publishAt: post.publishAt?.toISOString() || null }} />
    <section className="panel"><h2>Cover image</h2>{image && <img className="blog-cover-preview" src={image} alt={post.imageAlt || "Article cover preview"} />}<BlogImageControl id={id} title={post.title} canGenerate={Boolean(process.env.UNSAIDBOX_OPENAI_API_KEY && process.env.UNSAIDBOX_OPENAI_IMAGE_MODEL)} /></section>
    <section className="panel"><h2>Delete article</h2><p>Unpublish or cancel its schedule first. Deletion removes the article, cover and old-URL redirects.</p><DeleteForm action={deleteBlog.bind(null, id)} description="This article and its cover image will be permanently deleted." /></section>
  </AdminShell>;
}
