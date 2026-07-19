import type { MetadataRoute } from "next";

/**
 * Public crawl policy. The marketing pages (landing, pricing, help, legal)
 * are indexable; the app itself and every API stay out of search.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/help", "/legal/", "/home"],
        disallow: [
          "/api/",
          "/admin",
          "/talk",
          "/learn",
          "/lessons",
          "/dashboard",
          "/me",
          "/invite",
          "/onboarding",
          "/auth/",
          "/login",
          "/signup",
          "/reset",
          "/update-password",
          "/create",
        ],
      },
    ],
    sitemap: "https://miomika.com/sitemap.xml",
  };
}
