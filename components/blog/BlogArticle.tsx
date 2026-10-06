import Link from "next/link";
import { cleanBlogHtml, blogText } from "@/lib/blog-policy.mjs";
export function BlogArticle({ post, image }: { post: { title: string; excerpt: string; contentHtml: string; authorName: string; category: string; imageAlt: string; publishAt: Date | null }; image: string | null }) {
  const minutes = Math.max(1, Math.ceil(blogText(post.contentHtml).split(/\s+/).length / 220));
  return <article className="blog-article">
    <header className="blog-article-header"><p className="eyebrow">{post.category}</p><h1>{post.title}</h1><p className="blog-deck">{post.excerpt}</p><p className="fine">By {post.authorName} · {minutes} min read{post.publishAt && <> · <time dateTime={post.publishAt.toISOString()}>{post.publishAt.toLocaleDateString("en-GB", { dateStyle: "long", timeZone: "UTC" })}</time></>}</p></header>
    {image && <img className="blog-hero-image" src={image} alt={post.imageAlt || post.title} width={1600} height={900} />}
    <div className="blog-prose" dangerouslySetInnerHTML={{ __html: cleanBlogHtml(post.contentHtml) }} />
    <aside className="blog-cta"><p className="eyebrow">Make space for honest answers</p><h2>Your next conversation starts with a question.</h2><p>Create your own box, collect responses privately and choose what to share.</p><Link className="button" href="/start">Create your free box</Link></aside>
  </article>;
}
