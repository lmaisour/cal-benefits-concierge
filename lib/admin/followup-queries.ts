import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isMissingRelationError } from "@/lib/supabase/missing-relation";
import type {
  ProgramFollowupQuestionInsert,
  ProgramFollowupRuleInsert,
} from "@/types/database";
import type { ProgramFollowupQuestion, ProgramFollowupRule } from "@/types/program";

export async function listFollowupQuestionsForProgram(
  programId: string,
): Promise<ProgramFollowupQuestion[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("program_followup_questions")
    .select("*")
    .eq("program_id", programId)
    .order("sort_order", { ascending: true });
  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw new Error(`Failed to load follow-up questions: ${error.message}`);
  }
  return data;
}

export async function listFollowupRulesForProgram(
  programId: string,
): Promise<ProgramFollowupRule[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("program_followup_rules")
    .select("*")
    .eq("program_id", programId)
    .order("created_at", { ascending: true });
  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw new Error(`Failed to load follow-up rules: ${error.message}`);
  }
  return data;
}

export async function insertFollowupQuestion(
  payload: ProgramFollowupQuestionInsert,
): Promise<ProgramFollowupQuestion> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("program_followup_questions")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function updateFollowupQuestion(
  id: string,
  programId: string,
  payload: Omit<ProgramFollowupQuestionInsert, "program_id">,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("program_followup_questions")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("program_id", programId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteFollowupQuestion(id: string, programId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("program_followup_questions")
    .delete()
    .eq("id", id)
    .eq("program_id", programId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function insertFollowupRule(
  payload: ProgramFollowupRuleInsert,
): Promise<ProgramFollowupRule> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("program_followup_rules")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function updateFollowupRule(
  id: string,
  programId: string,
  payload: Omit<ProgramFollowupRuleInsert, "program_id">,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("program_followup_rules")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("program_id", programId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteFollowupRule(id: string, programId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("program_followup_rules")
    .delete()
    .eq("id", id)
    .eq("program_id", programId);
  if (error) {
    throw new Error(error.message);
  }
}
