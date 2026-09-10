import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProgramContentWritePayload } from "@/lib/admin/validate-content";
import type { FaqWritePayload } from "@/lib/admin/validate-faq";
import type { ProgramContent, ProgramFaq } from "@/types/program";

export async function upsertProgramContent(
  programId: string,
  payload: ProgramContentWritePayload,
): Promise<ProgramContent> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("program_content")
    .upsert({ program_id: programId, ...payload }, { onConflict: "program_id" })
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function insertFaq(
  programId: string,
  payload: FaqWritePayload,
): Promise<ProgramFaq> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("program_faqs")
    .insert({ program_id: programId, ...payload })
    .select("*")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function updateFaq(
  faqId: string,
  programId: string,
  payload: FaqWritePayload,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("program_faqs")
    .update(payload)
    .eq("id", faqId)
    .eq("program_id", programId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteFaq(faqId: string, programId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("program_faqs")
    .delete()
    .eq("id", faqId)
    .eq("program_id", programId);
  if (error) {
    throw new Error(error.message);
  }
}
