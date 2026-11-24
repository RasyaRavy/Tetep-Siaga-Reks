import type { MetadataRoute } from "next";
import { adm4ToSlug, KECAMATAN_MAP } from "@/lib/regions";

function getSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    "http://localhost:3100"
  );
}

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${origin}/`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${origin}/tentang`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  const kecamatanRoutes: MetadataRoute.Sitemap = KECAMATAN_MAP.kecamatan.map(
    (kec) => ({
      url: `${origin}/wilayah/${adm4ToSlug(kec.defaultAdm4)}`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    }),
  );

  return [...staticRoutes, ...kecamatanRoutes];
}
