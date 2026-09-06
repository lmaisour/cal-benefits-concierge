import "server-only";

import { getActivePrograms } from "@/lib/programs/get-active-programs";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Program, ProgramLocation, ProgramRule } from "@/types/program";

export type MatchableProgramData = {
  programs: Program[];
  rules: ProgramRule[];
  locations: ProgramLocation[];
};

/**
 * Active, non-expired programs plus their rules and locations.
 * Uses the publishable-key server client (RLS). Throws on data errors.
 */
export async function getMatchableProgramData(): Promise<MatchableProgramData> {
  const programs = await getActivePrograms();

  if (programs.length === 0) {
    return { programs: [], rules: [], locations: [] };
  }

  const supabase = createSupabaseServerClient();
  const programIds = programs.map((program) => program.id);

  const [rulesResult, locationsResult] = await Promise.all([
    supabase.from("program_rules").select("*").in("program_id", programIds),
    supabase.from("program_locations").select("*").in("program_id", programIds),
  ]);

  if (rulesResult.error) {
    throw new Error(
      `Failed to load program rules for matching: ${rulesResult.error.message}`,
    );
  }
  if (locationsResult.error) {
    throw new Error(
      `Failed to load program locations for matching: ${locationsResult.error.message}`,
    );
  }

  return {
    programs,
    rules: rulesResult.data,
    locations: locationsResult.data,
  };
}
