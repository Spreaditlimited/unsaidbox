import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { SiteShell } from "@/components/SiteShell";
import { BlogArticle } from "@/components/blog/BlogArticle";
import { getPublicBlog, blogImageUrl } from "@/lib/blog";
import { blogOrigin } from "@/lib/blog-policy.mjs";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPublicBlog((await params).slug);
  if (!post) return { title: "Article not found", robots: { index: false, follow: false } };
  const image = blogImageUrl(post);
  return { title: post.seoTitle || post.title, description: post.seoDescription || post.excerpt, robots: { index: true, follow: true }, alternates: { canonical: `${blogOrigin}/blog/${post.slug}` }, openGraph: { type: "article", title: post.seoTitle || post.title, description: post.seoDescription || post.excerpt, url: `${blogOrigin}/blog/${post.slug}`, publishedTime: post.publishAt!.toISOString(), modifiedTime: post.updatedAt.toISOString(), authors: [post.authorName], ...(image ? { images: [{ url: blogOrigin + image, width: 1600, height: 900, alt: post.imageAlt || post.title }] } : {}) }, twitter: { card: "summary_large_image", title: post.title, description: post.excerpt, ...(image ? { images: [blogOrigin + image] } : {}) } };
}
export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublicBlog(slug);
  if (!post) notFound();
  if (post.slug !== slug) permanentRedirect(`/blog/${post.slug}`);
  const image = blogImageUrl(post);
  const structured = { "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.excerpt, datePublished: post.publishAt!.toISOString(), dateModified: post.updatedAt.toISOString(), author: { "@type": "Person", name: post.authorName }, publisher: { "@type": "Organization", name: "UnsaidBox", url: blogOrigin }, mainEntityOfPage: `${blogOrigin}/blog/${post.slug}`, ...(image ? { image: [blogOrigin + image] } : {}) };
  return <SiteShell><div className="wrap blog-detail-wrap"><Link className="text-link" href="/blog">← All articles</Link><BlogArticle post={post} image={image} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }} /></div></SiteShell>;
}
