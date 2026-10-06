import { db } from "@/lib/db";
import { publicBlogWhere, blogOrigin } from "@/lib/blog-policy.mjs";
export const dynamic = "force-dynamic";
function xml(value: string) { return value.replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!); }
export async function GET() {
  const posts = await db().blogPost.findMany({ where: publicBlogWhere(), orderBy: [{ publishAt: "desc" }, { id: "desc" }], take: 30, select: { title: true, slug: true, excerpt: true, publishAt: true } });
  const items = posts.map(p => `<item><title>${xml(p.title)}</title><link>${blogOrigin}/blog/${p.slug}</link><guid>${blogOrigin}/blog/${p.slug}</guid><description>${xml(p.excerpt)}</description><pubDate>${p.publishAt!.toUTCString()}</pubDate></item>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>UnsaidBox journal</title><link>${blogOrigin}/blog</link><description>Better questions. More honest answers.</description>${items}</channel></rss>`, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "no-store" } });
}
