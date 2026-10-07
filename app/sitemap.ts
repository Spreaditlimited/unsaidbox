import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { publicBlogWhere, blogOrigin } from "@/lib/blog-policy.mjs";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: blogOrigin, changeFrequency: "weekly", priority: 1 },
    { url: `${blogOrigin}/blog`, changeFrequency: "daily", priority: 0.9 },
    { url: `${blogOrigin}/templates`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${blogOrigin}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${blogOrigin}/safety`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${blogOrigin}/cookies`, changeFrequency: "monthly", priority: 0.3 },
  ];
  try {
    const posts = await db().blogPost.findMany({ where: publicBlogWhere(), select: { slug: true, updatedAt: true }, orderBy: { publishAt: "desc" }, take: 45000 });
    return [...staticPages, ...posts.map(post => ({ url: `${blogOrigin}/blog/${post.slug}`, lastModified: post.updatedAt }))];
  } catch {
    // Match the Sure Imports fallback without logging connection details.
    console.error("Sitemap: blog lookup unavailable; serving public static pages.");
    return staticPages;
  }
}
