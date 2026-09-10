import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isMissingRelationError } from "@/lib/supabase/missing-relation";
import type { GuideWritePayload } from "@/lib/admin/validate-guide";
import type { Guide, Program } from "@/types/program";

export type AdminGuideDetail = {
  guide: Guide;
  relatedPrograms: Pick<Program, "id" | "name" | "slug" | "status" | "active">[];
};

export async function listAllGuides(): Promise<Guide[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("guides")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw new Error(`Failed to load guides: ${error.message}`);
  }
  return data;
}

export async function getAdminGuideById(id: string): Promise<AdminGuideDetail | null> {
  const supabase = createSupabaseAdminClient();
  const { data: guide, error } = await supabase
    .from("guides")
    .select("*")
    .eq("id", id)
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
    .eq("guide_id", id);
  if (linkError) {
    if (isMissingRelationError(linkError)) {
      return { guide, relatedPrograms: [] };
    }
    throw new Error(`Failed to load guide programs: ${linkError.message}`);
  }

  let relatedPrograms: AdminGuideDetail["relatedPrograms"] = [];
  const ids = links.map((link) => link.program_id);
  if (ids.length > 0) {
    const { data, error: programError } = await supabase
      .from("programs")
      .select("id, name, slug, status, active")
      .in("id", ids)
      .order("name", { ascending: true });
    if (programError) {
      throw new Error(`Failed to load related programs: ${programError.message}`);
    }
    relatedPrograms = data;
  }

  return { guide, relatedPrograms };
}

export async function guideSlugIsTaken(
  slug: string,
  exceptId?: string,
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("guides").select("id").eq("slug", slug);
  if (exceptId) {
    query = query.neq("id", exceptId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(`Failed to check guide slug: ${error.message}`);
  }
  return data !== null;
}

export async function createGuide(payload: GuideWritePayload): Promise<Guide> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("guides")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function updateGuide(
  id: string,
  payload: GuideWritePayload,
): Promise<Guide> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("guides")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function replaceGuidePrograms(
  guideId: string,
  programIds: string[],
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error: deleteError } = await supabase
    .from("guide_programs")
    .delete()
    .eq("guide_id", guideId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }
  if (programIds.length === 0) {
    return;
  }
  const { error } = await supabase.from("guide_programs").insert(
    programIds.map((program_id) => ({ guide_id: guideId, program_id })),
  );
  if (error) {
    throw new Error(error.message);
  }
}

export async function listProgramOptions(): Promise<
  Pick<Program, "id" | "name" | "slug" | "status" | "active">[]
> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("programs")
    .select("id, name, slug, status, active")
    .order("name", { ascending: true });
  if (error) {
    throw new Error(`Failed to load programs: ${error.message}`);
  }
  return data;
}
