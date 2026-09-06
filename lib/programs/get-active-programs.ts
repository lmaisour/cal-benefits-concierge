import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Program } from "@/types/program";

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
