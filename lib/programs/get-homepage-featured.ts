import "server-only";

import { selectHomepageFeatured } from "@/lib/content/featured";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingRelationError } from "@/lib/supabase/missing-relation";
import type { Program } from "@/types/program";

export async function getHomepageFeaturedPrograms(): Promise<Program[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("homepage_features")
    .select("sort_order, program_id")
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
    .select("*")
    .in("id", ids);

  if (programError) {
    throw new Error(`Failed to load featured programs: ${programError.message}`);
  }

  const byId = new Map(programs.map((program) => [program.id, program]));
  return selectHomepageFeatured(
    data.map((row) => ({
      sort_order: row.sort_order,
      program: byId.get(row.program_id) ?? null,
    })),
  );
}
