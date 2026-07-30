import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/marketing/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/onboarding",
        "/login",
        "/signup",
        "/website/",
        "/crm",
        "/ai",
        "/chatbot",
        "/automation",
        "/analytics",
        "/billing",
        "/settings",
        "/notifications",
        "/deployment",
        "/guardian",
        "/knowledge",
        "/memory",
        "/marketplace",
        "/whatsapp",
        "/email",
        "/embed/",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
