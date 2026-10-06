import "@/app/blog.css";
export const metadata = { alternates: { types: { "application/rss+xml": "https://unsaidbox.com/blog/feed" } } };
export default function BlogLayout({ children }: { children: React.ReactNode }) { return children; }
