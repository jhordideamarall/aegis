import { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

const baseUrl = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/_next/",
          "/dashboard/",
          "/orders/",
          "/members/",
          "/products/",
          "/pos/",
          "/settings/",
          "/locked/",
          "/setup/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/admin/", "/_next/", "/dashboard/", "/orders/", "/members/", "/products/", "/pos/", "/settings/", "/locked/"],
      },
      {
        userAgent: "Googlebot-Image",
        allow: "/img/",
        disallow: ["/api/", "/admin/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
