import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: ["/blog", "/_next/static/"], disallow: "/" }, sitemap: "https://unsaidbox.com/sitemap.xml" };
}
