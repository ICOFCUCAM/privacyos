import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://privacyos.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/scan", priority: 0.95, changeFrequency: "weekly" },
    { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
    { path: "/security", priority: 0.7, changeFrequency: "monthly" },
    { path: "/login", priority: 0.5, changeFrequency: "monthly" },
  ];
  return routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
