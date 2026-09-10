import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isMissingRelationError } from "@/lib/supabase/missing-relation";
import type { ContentBriefWritePayload } from "@/lib/admin/validate-content-brief";
import type { ContentEvidenceWritePayload } from "@/lib/admin/validate-content-evidence";
import type { ContentBrief, ContentEvidence } from "@/types/program";

export async function getContentBriefForProgram(
  programId: string,
): Promise<ContentBrief | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("content_briefs")
    .select("*")
    .eq("program_id", programId)
    .maybeSingle();
  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }
    throw new Error(`Failed to load content brief: ${error.message}`);
  }
  return data;
}

export async function getContentBriefForGuide(
  guideId: string,
): Promise<ContentBrief | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("content_briefs")
    .select("*")
    .eq("guide_id", guideId)
    .maybeSingle();
  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }
    throw new Error(`Failed to load content brief: ${error.message}`);
  }
  return data;
}

export async function upsertContentBrief(
  payload: ContentBriefWritePayload,
): Promise<ContentBrief> {
  const supabase = createSupabaseAdminClient();
  const onConflict = payload.content_type === "PROGRAM" ? "program_id" : "guide_id";
  const { data, error } = await supabase
    .from("content_briefs")
    .upsert(payload, { onConflict })
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function listContentEvidenceForProgram(
  programId: string,
): Promise<ContentEvidence[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("content_evidence")
    .select("*")
    .eq("program_id", programId)
    .order("created_at", { ascending: true });
  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw new Error(`Failed to load editorial evidence: ${error.message}`);
  }
  return data;
}

export async function insertContentEvidence(
  programId: string,
  payload: ContentEvidenceWritePayload,
): Promise<ContentEvidence> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("content_evidence")
    .insert({ program_id: programId, ...payload })
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function updateContentEvidence(
  evidenceId: string,
  programId: string,
  payload: ContentEvidenceWritePayload,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("content_evidence")
    .update(payload)
    .eq("id", evidenceId)
    .eq("program_id", programId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteContentEvidence(
  evidenceId: string,
  programId: string,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("content_evidence")
    .delete()
    .eq("id", evidenceId)
    .eq("program_id", programId);
  if (error) {
    throw new Error(error.message);
  }
}
