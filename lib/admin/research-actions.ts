"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  deleteContentEvidence,
  insertContentEvidence,
  updateContentEvidence,
  upsertContentBrief,
} from "@/lib/admin/research-queries";
import {
  contentBriefFormFromData,
  validateContentBriefForm,
  type ContentBriefFormValues,
} from "@/lib/admin/validate-content-brief";
import {
  contentEvidenceFormFromData,
  validateContentEvidenceForm,
  type ContentEvidenceFormValues,
} from "@/lib/admin/validate-content-evidence";
import type { FieldErrors } from "@/lib/admin/validate-program";

export type ContentBriefActionState = {
  ok: boolean;
  formError?: string;
  errors?: FieldErrors;
  values?: ContentBriefFormValues;
};

export type ContentEvidenceActionState = {
  ok: boolean;
  formError?: string;
  errors?: FieldErrors;
  values?: ContentEvidenceFormValues;
};

export async function upsertProgramContentBriefAction(
  programId: string,
  _prev: ContentBriefActionState,
  formData: FormData,
): Promise<ContentBriefActionState> {
  await requireAdminSession();
  const values = contentBriefFormFromData(formData);
  const parsed = validateContentBriefForm(values, {
    contentType: "PROGRAM",
    programId,
  });
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors, values };
  }
  try {
    await upsertContentBrief(parsed.data);
    revalidatePath(`/admin/programs/${programId}`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      formError: error instanceof Error ? error.message : "Could not save research brief.",
      values,
    };
  }
}

export async function upsertGuideContentBriefAction(
  guideId: string,
  _prev: ContentBriefActionState,
  formData: FormData,
): Promise<ContentBriefActionState> {
  await requireAdminSession();
  const values = contentBriefFormFromData(formData);
  const parsed = validateContentBriefForm(values, {
    contentType: "GUIDE",
    guideId,
  });
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors, values };
  }
  try {
    await upsertContentBrief(parsed.data);
    revalidatePath(`/admin/guides/${guideId}`);
    revalidatePath("/admin/guides");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      formError: error instanceof Error ? error.message : "Could not save research brief.",
      values,
    };
  }
}

export async function addContentEvidenceAction(
  programId: string,
  _prev: ContentEvidenceActionState,
  formData: FormData,
): Promise<ContentEvidenceActionState> {
  await requireAdminSession();
  const values = contentEvidenceFormFromData(formData);
  const parsed = validateContentEvidenceForm(values, programId);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors, values };
  }
  try {
    await insertContentEvidence(programId, parsed.data);
    revalidatePath(`/admin/programs/${programId}`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      formError: error instanceof Error ? error.message : "Could not add evidence.",
      values,
    };
  }
}

export async function updateContentEvidenceAction(
  programId: string,
  evidenceId: string,
  _prev: ContentEvidenceActionState,
  formData: FormData,
): Promise<ContentEvidenceActionState> {
  await requireAdminSession();
  const values = contentEvidenceFormFromData(formData);
  const parsed = validateContentEvidenceForm(values, programId);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors, values };
  }
  try {
    await updateContentEvidence(evidenceId, programId, parsed.data);
    revalidatePath(`/admin/programs/${programId}`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      formError: error instanceof Error ? error.message : "Could not save evidence.",
      values,
    };
  }
}

export async function deleteContentEvidenceAction(
  programId: string,
  evidenceId: string,
): Promise<void> {
  await requireAdminSession();
  await deleteContentEvidence(evidenceId, programId);
  revalidatePath(`/admin/programs/${programId}`);
}
