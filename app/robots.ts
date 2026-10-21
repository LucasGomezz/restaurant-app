import type { MetadataRoute } from "next";

/** Only the public pages are for search engines; the app itself is private. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/$", "/terminos", "/privacidad", "/login", "/registro"],
      disallow: "/",
    },
  };
}
