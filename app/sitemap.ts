import type { MetadataRoute } from "next";
import { CANONICAL_ORIGIN } from "@/lib/seo/site-url";
import { getActivePrograms } from "@/lib/programs/get-active-programs";
import { listPublishedGuideSlugs } from "@/lib/guides/public-queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: `${CANONICAL_ORIGIN}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${CANONICAL_ORIGIN}/programs`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${CANONICAL_ORIGIN}/guides`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];

  if (!isSupabaseConfigured()) {
    return entries;
  }

  try {
    const [programs, guides] = await Promise.all([
      getActivePrograms(),
      listPublishedGuideSlugs(),
    ]);
    for (const program of programs) {
      entries.push({
        url: `${CANONICAL_ORIGIN}/programs/${program.slug}`,
        lastModified: program.updated_at ? new Date(program.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
    for (const guide of guides) {
      entries.push({
        url: `${CANONICAL_ORIGIN}/guides/${guide.slug}`,
        lastModified: guide.updated_at ? new Date(guide.updated_at) : now,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch {
    return entries;
  }

  return entries;
}
