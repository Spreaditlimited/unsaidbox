import { requireAdministrator } from "@/lib/admin-auth";
import { blogCategories } from "@/lib/blog-policy.mjs";
import { AdminShell } from "@/components/AdminShell";
import { BlogEditor } from "@/components/blog/BlogEditor";
import Link from "next/link";
export default async function NewArticle() {
  const admin = await requireAdministrator();
  return <AdminShell name={admin.displayName}><Link className="text-link" href="/admin/blog">← All articles</Link><h1>New article</h1><p className="fine">Save your draft first to upload or generate its cover image.</p><BlogEditor categories={blogCategories} post={{ id: null, revision: 0, title: "", slug: "", excerpt: "", contentHtml: "", category: blogCategories[0], authorName: "UnsaidBox Editorial", seoTitle: "", seoDescription: "", imageAlt: "", published: false, publishAt: null }} /></AdminShell>;
}
