import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Program, ProgramLocation } from "@/types/program";

export async function getActivePrograms(): Promise<Program[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .eq("active", true)
    .neq("status", "EXPIRED")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load programs: ${error.message}`);
  }

  return data;
}

export async function getLocationsForPrograms(
  programIds: string[],
): Promise<ProgramLocation[]> {
  if (programIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("program_locations")
    .select("*")
    .in("program_id", programIds)
    .order("location_type", { ascending: true });

  if (error) {
    throw new Error(`Failed to load program locations: ${error.message}`);
  }

  return data;
}
