import type { MetadataRoute } from "next";
import { CANONICAL_ORIGIN } from "@/lib/seo/site-url";
import { getActivePrograms } from "@/lib/programs/get-active-programs";
import { listPublishedGuideSlugs } from "@/lib/guides/public-queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

function lastModifiedFrom(updatedAt: string | null | undefined): Date | undefined {
  if (!updatedAt) {
    return undefined;
  }
  const parsed = new Date(updatedAt);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${CANONICAL_ORIGIN}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${CANONICAL_ORIGIN}/programs`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${CANONICAL_ORIGIN}/guides`, changeFrequency: "weekly", priority: 0.6 },
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
        lastModified: lastModifiedFrom(program.updated_at),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
    for (const guide of guides) {
      entries.push({
        url: `${CANONICAL_ORIGIN}/guides/${guide.slug}`,
        lastModified: lastModifiedFrom(guide.updated_at),
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch {
    return entries;
  }

  return entries;
}
