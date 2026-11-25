import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const publicPages = ["/", "/dashboard", "/how-to-test-perkify", "/terms", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPages.map((path) => ({ url: new URL(path, SITE_URL).href }));
}
