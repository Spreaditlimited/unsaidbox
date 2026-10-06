import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { publicBlogWhere, blogOrigin } from "@/lib/blog-policy.mjs";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await db().blogPost.findMany({ where: publicBlogWhere(), select: { slug: true, updatedAt: true }, orderBy: { publishAt: "desc" }, take: 45000 });
  return [{ url: `${blogOrigin}/blog` }, ...posts.map(post => ({ url: `${blogOrigin}/blog/${post.slug}`, lastModified: post.updatedAt }))];
}
