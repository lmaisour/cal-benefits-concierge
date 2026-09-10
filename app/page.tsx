import { HomePage } from "@/components/home/home-page";
import { siteConfig } from "@/lib/config/site";
import { getHomepageFeaturedPrograms } from "@/lib/programs/get-homepage-featured";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Program } from "@/types/program";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: `${siteConfig.name} | ${siteConfig.tagline}`,
  },
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

export default async function Page() {
  let featuredPrograms: Program[] = [];
  if (isSupabaseConfigured()) {
    try {
      featuredPrograms = await getHomepageFeaturedPrograms();
    } catch {
      featuredPrograms = [];
    }
  }

  return <HomePage featuredPrograms={featuredPrograms} />;
}
