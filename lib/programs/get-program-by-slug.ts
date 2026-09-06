import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Program,
  ProgramLocation,
  ProgramRelationship,
  ProgramRule,
  ProgramSource,
} from "@/types/program";

export type RelatedProgram = {
  program: Program;
  relationship: ProgramRelationship;
};

export type ProgramDetail = {
  program: Program;
  rules: ProgramRule[];
  locations: ProgramLocation[];
  sources: ProgramSource[];
  related: RelatedProgram[];
};

export async function getProgramBySlug(
  slug: string,
): Promise<ProgramDetail | null> {
  const supabase = createSupabaseServerClient();

  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .neq("status", "EXPIRED")
    .maybeSingle();

  if (programError) {
    throw new Error(`Failed to load program: ${programError.message}`);
  }

  if (!program) {
    return null;
  }

  const [rulesResult, locationsResult, sourcesResult, relationshipsResult] =
    await Promise.all([
      supabase
        .from("program_rules")
        .select("*")
        .eq("program_id", program.id)
        .order("rule_group", { ascending: true }),
      supabase
        .from("program_locations")
        .select("*")
        .eq("program_id", program.id)
        .order("location_type", { ascending: true }),
      supabase
        .from("program_sources")
        .select("*")
        .eq("program_id", program.id)
        .order("source_type", { ascending: true }),
      supabase
        .from("program_relationships")
        .select("*")
        .or(`program_a_id.eq.${program.id},program_b_id.eq.${program.id}`),
    ]);

  if (rulesResult.error) {
    throw new Error(`Failed to load program rules: ${rulesResult.error.message}`);
  }
  if (locationsResult.error) {
    throw new Error(
      `Failed to load program locations: ${locationsResult.error.message}`,
    );
  }
  if (sourcesResult.error) {
    throw new Error(
      `Failed to load program sources: ${sourcesResult.error.message}`,
    );
  }
  if (relationshipsResult.error) {
    throw new Error(
      `Failed to load program relationships: ${relationshipsResult.error.message}`,
    );
  }

  const relationships = relationshipsResult.data;
  const relatedIds = relationships.map((relationship) =>
    relationship.program_a_id === program.id
      ? relationship.program_b_id
      : relationship.program_a_id,
  );

  let relatedPrograms: Program[] = [];
  if (relatedIds.length > 0) {
    const { data, error } = await supabase
      .from("programs")
      .select("*")
      .in("id", relatedIds)
      .eq("active", true)
      .neq("status", "EXPIRED");

    if (error) {
      throw new Error(`Failed to load related programs: ${error.message}`);
    }
    relatedPrograms = data;
  }

  const relatedById = new Map(relatedPrograms.map((item) => [item.id, item]));
  const related: RelatedProgram[] = [];
  for (const relationship of relationships) {
    const otherId =
      relationship.program_a_id === program.id
        ? relationship.program_b_id
        : relationship.program_a_id;
    const other = relatedById.get(otherId);
    if (other) {
      related.push({ program: other, relationship });
    }
  }

  return {
    program,
    rules: rulesResult.data,
    locations: locationsResult.data,
    sources: sourcesResult.data,
    related,
  };
}
