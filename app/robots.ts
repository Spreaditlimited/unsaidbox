import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  // Public information pages are crawlable; account and audience content are not.
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/", "/admin", "/dashboard", "/auth/", "/private/",
          "/login", "/start", "/forgot-password", "/reset-password", "/verify-email",
          "/u/", "/q/", "/f/", "/explore", "/demo",
        ],
      },
    ],
    sitemap: "https://unsaidbox.com/sitemap.xml",
    host: "https://unsaidbox.com",
  };
}
