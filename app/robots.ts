import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  // The root restriction also covers the sitemap unless it is explicitly allowed.
  return { rules: { userAgent: "*", allow: ["/sitemap.xml$", "/blog", "/_next/static/"], disallow: "/" }, sitemap: "https://unsaidbox.com/sitemap.xml" };
}
