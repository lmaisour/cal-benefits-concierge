"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin/auth";
import type { FieldErrors } from "@/lib/admin/validate-program";
import {
  deleteFollowupRule,
  getFollowupQuestionById,
  insertFollowupRule,
  updateFollowupRule,
} from "@/lib/admin/followup-queries";
import {
  FOLLOWUP_QUESTION_SCOPE_ERROR,
  followupRuleFormFromData,
  isFollowupQuestionOnProgram,
  validateFollowupRuleForm,
} from "@/lib/admin/validate-followup";

type RelatedActionState = {
  ok: boolean;
  formError?: string;
  errors?: FieldErrors;
};

export async function addFollowupRuleAction(
  programId: string,
  _prev: RelatedActionState,
  formData: FormData,
): Promise<RelatedActionState> {
  await requireAdminSession();
  const parsed = validateFollowupRuleForm(followupRuleFormFromData(formData));
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors };
  }
  try {
    const question = await getFollowupQuestionById(parsed.data.question_id);
    if (!isFollowupQuestionOnProgram(question, programId)) {
      return { ok: false, errors: { question_id: FOLLOWUP_QUESTION_SCOPE_ERROR } };
    }
    await insertFollowupRule({ ...parsed.data, program_id: programId });
    revalidateAdminProgram(programId);
    return { ok: true };
  } catch (error) {
    return relatedError(error);
  }
}

export async function updateFollowupRuleAction(
  programId: string,
  ruleId: string,
  _prev: RelatedActionState,
  formData: FormData,
): Promise<RelatedActionState> {
  await requireAdminSession();
  const parsed = validateFollowupRuleForm(followupRuleFormFromData(formData));
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors };
  }
  try {
    const question = await getFollowupQuestionById(parsed.data.question_id);
    if (!isFollowupQuestionOnProgram(question, programId)) {
      return { ok: false, errors: { question_id: FOLLOWUP_QUESTION_SCOPE_ERROR } };
    }
    await updateFollowupRule(ruleId, programId, parsed.data);
    revalidateAdminProgram(programId);
    return { ok: true };
  } catch (error) {
    return relatedError(error);
  }
}

export async function deleteFollowupRuleAction(
  programId: string,
  ruleId: string,
): Promise<void> {
  await requireAdminSession();
  await deleteFollowupRule(ruleId, programId);
  revalidateAdminProgram(programId);
}

function revalidateAdminProgram(programId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/programs");
  revalidatePath(`/admin/programs/${programId}`);
}

function relatedError(error: unknown): RelatedActionState {
  return {
    ok: false,
    formError: error instanceof Error ? error.message : "Save failed.",
  };
}
