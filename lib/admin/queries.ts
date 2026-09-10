import "server-only";

import { isMissingRelationError } from "@/lib/supabase/missing-relation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getContentBriefForProgram,
  listContentEvidenceForProgram,
} from "@/lib/admin/research-queries";
import type { ProgramWritePayload } from "@/lib/admin/validate-program";
import type { AdminRelatedProgram } from "@/lib/admin/form-values";
import type {
  ProgramLocationInsert,
  ProgramRuleInsert,
  ProgramSourceInsert,
} from "@/types/database";
import type {
  ContentBrief,
  ContentEvidence,
  HomepageFeature,
  Program,
  ProgramContent,
  ProgramFaq,
  ProgramLocation,
  ProgramRule,
  ProgramSource,
} from "@/types/program";

export type { AdminRelatedProgram };

export type AdminProgramDetail = {
  program: Program;
  rules: ProgramRule[];
  locations: ProgramLocation[];
  sources: ProgramSource[];
  related: AdminRelatedProgram[];
  content: ProgramContent | null;
  faqs: ProgramFaq[];
  homepageFeature: HomepageFeature | null;
  contentBrief: ContentBrief | null;
  evidence: ContentEvidence[];
};

export async function listAllPrograms(): Promise<Program[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load programs: ${error.message}`);
  }
  return data;
}

export async function getAdminProgramById(
  id: string,
): Promise<AdminProgramDetail | null> {
  const supabase = createSupabaseAdminClient();
  const { data: program, error } = await supabase
    .from("programs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load program: ${error.message}`);
  }
  if (!program) {
    return null;
  }

  const [
    rulesResult,
    locationsResult,
    sourcesResult,
    relationshipsResult,
    contentResult,
    faqsResult,
    featureResult,
    contentBrief,
    evidence,
  ] = await Promise.all([
      supabase
        .from("program_rules")
        .select("*")
        .eq("program_id", id)
        .order("rule_group", { ascending: true }),
      supabase
        .from("program_locations")
        .select("*")
        .eq("program_id", id)
        .order("location_type", { ascending: true }),
      supabase
        .from("program_sources")
        .select("*")
        .eq("program_id", id)
        .order("source_type", { ascending: true }),
      supabase
        .from("program_relationships")
        .select("*")
        .or(`program_a_id.eq.${id},program_b_id.eq.${id}`),
      supabase.from("program_content").select("*").eq("program_id", id).maybeSingle(),
      supabase
        .from("program_faqs")
        .select("*")
        .eq("program_id", id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase.from("homepage_features").select("*").eq("program_id", id).maybeSingle(),
      getContentBriefForProgram(id),
      listContentEvidenceForProgram(id),
    ]);

  if (rulesResult.error) {
    throw new Error(`Failed to load rules: ${rulesResult.error.message}`);
  }
  if (locationsResult.error) {
    throw new Error(
      `Failed to load locations: ${locationsResult.error.message}`,
    );
  }
  if (sourcesResult.error) {
    throw new Error(`Failed to load sources: ${sourcesResult.error.message}`);
  }
  if (relationshipsResult.error) {
    throw new Error(
      `Failed to load relationships: ${relationshipsResult.error.message}`,
    );
  }
  if (contentResult.error && !isMissingRelationError(contentResult.error)) {
    throw new Error(`Failed to load program content: ${contentResult.error.message}`);
  }
  if (faqsResult.error && !isMissingRelationError(faqsResult.error)) {
    throw new Error(`Failed to load FAQs: ${faqsResult.error.message}`);
  }
  if (featureResult.error && !isMissingRelationError(featureResult.error)) {
    throw new Error(
      `Failed to load homepage feature: ${featureResult.error.message}`,
    );
  }

  const relatedIds = relationshipsResult.data.map((relationship) =>
    relationship.program_a_id === id
      ? relationship.program_b_id
      : relationship.program_a_id,
  );

  let relatedPrograms: Pick<Program, "id" | "name" | "slug">[] = [];
  if (relatedIds.length > 0) {
    const { data, error: relatedError } = await supabase
      .from("programs")
      .select("id, name, slug")
      .in("id", relatedIds);
    if (relatedError) {
      throw new Error(
        `Failed to load related programs: ${relatedError.message}`,
      );
    }
    relatedPrograms = data;
  }

  const relatedById = new Map(relatedPrograms.map((item) => [item.id, item]));
  const related: AdminRelatedProgram[] = [];
  for (const relationship of relationshipsResult.data) {
    const otherId =
      relationship.program_a_id === id
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
    content: contentResult.error ? null : contentResult.data,
    faqs: faqsResult.error ? [] : faqsResult.data,
    homepageFeature: featureResult.error ? null : featureResult.data,
    contentBrief,
    evidence,
  };
}

export async function slugIsTaken(
  slug: string,
  exceptId?: string,
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("programs").select("id").eq("slug", slug);
  if (exceptId) {
    query = query.neq("id", exceptId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(`Failed to check slug: ${error.message}`);
  }
  return data !== null;
}

export async function createProgram(
  payload: ProgramWritePayload,
): Promise<Program> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("programs")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function updateProgram(
  id: string,
  payload: ProgramWritePayload,
): Promise<Program> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("programs")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function insertRule(
  payload: ProgramRuleInsert,
): Promise<ProgramRule> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("program_rules")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function updateRule(
  id: string,
  programId: string,
  payload: Omit<ProgramRuleInsert, "program_id">,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("program_rules")
    .update(payload)
    .eq("id", id)
    .eq("program_id", programId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteRule(id: string, programId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("program_rules")
    .delete()
    .eq("id", id)
    .eq("program_id", programId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function insertLocation(
  payload: ProgramLocationInsert,
): Promise<ProgramLocation> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("program_locations")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function updateLocation(
  id: string,
  programId: string,
  payload: Omit<ProgramLocationInsert, "program_id">,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("program_locations")
    .update(payload)
    .eq("id", id)
    .eq("program_id", programId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteLocation(
  id: string,
  programId: string,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("program_locations")
    .delete()
    .eq("id", id)
    .eq("program_id", programId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function insertSource(
  payload: ProgramSourceInsert,
): Promise<ProgramSource> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("program_sources")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function updateSource(
  id: string,
  programId: string,
  payload: Omit<ProgramSourceInsert, "program_id">,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("program_sources")
    .update(payload)
    .eq("id", id)
    .eq("program_id", programId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteSource(id: string, programId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("program_sources")
    .delete()
    .eq("id", id)
    .eq("program_id", programId);
  if (error) {
    throw new Error(error.message);
  }
}
