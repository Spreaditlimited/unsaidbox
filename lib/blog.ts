import "server-only";
import { cache } from "react";
import { db } from "./db";
import { publicBlogWhere } from "./blog-policy.mjs";

export const blogSelect = {
  id: true, slug: true, title: true, excerpt: true, contentHtml: true,
  authorName: true, category: true, seoTitle: true, seoDescription: true,
  imageAlt: true, publishAt: true, updatedAt: true,
  image: { select: { version: true } },
} as const;
export const getPublicBlog = cache(async (slug: string) => {
  const alias = await db().blogSlug.findUnique({ where: { slug }, select: { postId: true } });
  if (!alias) return null;
  return db().blogPost.findFirst({ where: { id: alias.postId, ...publicBlogWhere() }, select: blogSelect });
});
export function blogImageUrl(post: { id: string; image: { version: string } | null }, preview = false) {
  return post.image ? `${preview ? "/admin/blog" : "/blog/media"}/${post.id}${preview ? "/image" : ""}?v=${post.image.version}` : null;
}
