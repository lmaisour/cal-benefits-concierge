import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isMissingRelationError } from "@/lib/supabase/missing-relation";
import type { HomepageFeatureCandidate } from "@/lib/admin/homepage-feature-eligibility";
import type { HomepageFeature, Program } from "@/types/program";

export type AdminHomepageFeature = HomepageFeature & {
  program: Pick<Program, "id" | "name" | "slug" | "status" | "active">;
};

export async function listHomepageFeatures(): Promise<AdminHomepageFeature[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("homepage_features")
    .select("program_id, sort_order, created_at, updated_at")
    .order("sort_order", { ascending: true });
  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw new Error(`Failed to load homepage features: ${error.message}`);
  }
  if (data.length === 0) {
    return [];
  }
  const ids = data.map((row) => row.program_id);
  const { data: programs, error: programError } = await supabase
    .from("programs")
    .select("id, name, slug, status, active")
    .in("id", ids);
  if (programError) {
    throw new Error(`Failed to load featured programs: ${programError.message}`);
  }
  const byId = new Map(programs.map((program) => [program.id, program]));
  const features: AdminHomepageFeature[] = [];
  for (const row of data) {
    const program = byId.get(row.program_id);
    if (program) {
      features.push({ ...row, program });
    }
  }
  return features;
}

export async function getProgramStatusForHomepageFeature(
  programId: string,
): Promise<HomepageFeatureCandidate | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("programs")
    .select("active, status")
    .eq("id", programId)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load program: ${error.message}`);
  }
  return data;
}

export async function upsertHomepageFeature(
  programId: string,
  sortOrder: number,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("homepage_features").upsert(
    { program_id: programId, sort_order: sortOrder },
    { onConflict: "program_id" },
  );
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteHomepageFeature(programId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("homepage_features")
    .delete()
    .eq("program_id", programId);
  if (error) {
    throw new Error(error.message);
  }
}
