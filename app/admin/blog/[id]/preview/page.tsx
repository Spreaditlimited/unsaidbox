import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdministrator } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { blogImageUrl } from "@/lib/blog";
import { AdminShell } from "@/components/AdminShell";
import { BlogArticle } from "@/components/blog/BlogArticle";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdministrator();
  const { id } = await params;
  const post = await db().blogPost.findUnique({ where: { id }, include: { image: { select: { version: true } } } });
  if (!post) notFound();
  return <AdminShell name={admin.displayName}><div className="panel"><strong>Private preview · saved content only</strong><p>Only signed-in administrators can open this preview.</p><Link className="button secondary" href={`/admin/blog/${id}`}>Back to editor</Link></div><BlogArticle post={post} image={blogImageUrl(post, true)} /></AdminShell>;
}
