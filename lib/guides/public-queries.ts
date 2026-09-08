import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingRelationError } from "@/lib/supabase/missing-relation";
import type { Guide, Program } from "@/types/program";

export type PublicGuideListItem = Pick<
  Guide,
  "id" | "title" | "slug" | "excerpt" | "published_at" | "updated_at"
>;

export type PublicGuideDetail = {
  guide: Guide;
  relatedPrograms: Pick<
    Program,
    "id" | "name" | "slug" | "short_description" | "benefit_summary" | "status" | "active"
  >[];
};

export async function listPublishedGuides(): Promise<PublicGuideListItem[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("guides")
    .select("id, title, slug, excerpt, published_at, updated_at")
    .eq("published", true)
    .order("published_at", { ascending: false });
  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw new Error(`Failed to load guides: ${error.message}`);
  }
  return data;
}

export async function getPublishedGuideBySlug(
  slug: string,
): Promise<PublicGuideDetail | null> {
  const supabase = createSupabaseServerClient();
  const { data: guide, error } = await supabase
    .from("guides")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }
    throw new Error(`Failed to load guide: ${error.message}`);
  }
  if (!guide) {
    return null;
  }

  const { data: links, error: linkError } = await supabase
    .from("guide_programs")
    .select("program_id")
    .eq("guide_id", guide.id);
  if (linkError) {
    if (isMissingRelationError(linkError)) {
      return { guide, relatedPrograms: [] };
    }
    throw new Error(`Failed to load related programs: ${linkError.message}`);
  }

  let relatedPrograms: PublicGuideDetail["relatedPrograms"] = [];
  const ids = links.map((link) => link.program_id);
  if (ids.length > 0) {
    const { data, error: programError } = await supabase
      .from("programs")
      .select("id, name, slug, short_description, benefit_summary, status, active")
      .in("id", ids)
      .eq("active", true)
      .neq("status", "EXPIRED");
    if (programError) {
      throw new Error(`Failed to load related programs: ${programError.message}`);
    }
    relatedPrograms = data;
  }

  return { guide, relatedPrograms };
}

export async function listPublishedGuidesForProgram(
  programId: string,
): Promise<PublicGuideListItem[]> {
  const supabase = createSupabaseServerClient();
  const { data: links, error: linkError } = await supabase
    .from("guide_programs")
    .select("guide_id")
    .eq("program_id", programId);
  if (linkError) {
    if (isMissingRelationError(linkError)) {
      return [];
    }
    throw new Error(`Failed to load related guides: ${linkError.message}`);
  }
  if (links.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("guides")
    .select("id, title, slug, excerpt, published_at, updated_at")
    .in(
      "id",
      links.map((link) => link.guide_id),
    )
    .eq("published", true)
    .order("published_at", { ascending: false });
  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw new Error(`Failed to load related guides: ${error.message}`);
  }
  return data;
}

export async function listPublishedGuideSlugs(): Promise<
  Pick<Guide, "slug" | "updated_at">[]
> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("guides")
    .select("slug, updated_at")
    .eq("published", true);
  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw new Error(`Failed to load guide slugs: ${error.message}`);
  }
  return data;
}
