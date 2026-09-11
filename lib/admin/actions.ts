"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAdminSession,
  destroyAdminSession,
  requireAdminSession,
  verifyAdminPassword,
  adminPasswordConfigured,
} from "@/lib/admin/auth";
import {
  createProgram,
  deleteLocation,
  deleteRule,
  deleteSource,
  insertLocation,
  insertRule,
  insertSource,
  slugIsTaken,
  updateLocation,
  updateProgram,
  updateRule,
  updateSource,
} from "@/lib/admin/queries";
import {
  deleteFollowupQuestion,
  deleteFollowupRule,
  insertFollowupQuestion,
  insertFollowupRule,
  updateFollowupQuestion,
  updateFollowupRule,
} from "@/lib/admin/followup-queries";
import {
  deleteFaq,
  insertFaq,
  updateFaq,
  upsertProgramContent,
} from "@/lib/admin/content-queries";
import {
  createGuide,
  guideSlugIsTaken,
  replaceGuidePrograms,
  updateGuide,
} from "@/lib/admin/guide-queries";
import { featureProgramOnHomepage } from "@/lib/admin/homepage-feature-eligibility";
import {
  deleteHomepageFeature,
  getProgramStatusForHomepageFeature,
  upsertHomepageFeature,
} from "@/lib/admin/homepage-queries";
import { saveNewGuide } from "@/lib/admin/save-new-guide";
import { saveNewProgram } from "@/lib/admin/save-new-program";
import {
  contentFormFromData,
  validateContentForm,
  type ProgramContentFormValues,
} from "@/lib/admin/validate-content";
import {
  faqFormFromData,
  validateFaqForm,
  type FaqFormValues,
} from "@/lib/admin/validate-faq";
import {
  guideFormFromData,
  validateGuideForm,
  type GuideFormValues,
} from "@/lib/admin/validate-guide";
import {
  homepageFeatureFormFromData,
  validateHomepageFeatureForm,
} from "@/lib/admin/validate-homepage-feature";
import {
  programFormFromData,
  validateProgramForm,
  type FieldErrors,
  type ProgramFormValues,
} from "@/lib/admin/validate-program";
import {
  followupQuestionFormFromData,
  followupRuleFormFromData,
  validateFollowupQuestionForm,
  validateFollowupRuleForm,
} from "@/lib/admin/validate-followup";
import {
  locationFormFromData,
  ruleFormFromData,
  sourceFormFromData,
  validateLocationForm,
  validateRuleForm,
  validateSourceForm,
} from "@/lib/admin/validate-related";

export type ProgramActionState = {
  ok: boolean;
  formError?: string;
  errors?: FieldErrors;
  values?: ProgramFormValues;
};

export type RelatedActionState = {
  ok: boolean;
  formError?: string;
  errors?: FieldErrors;
};

export type ContentActionState = {
  ok: boolean;
  formError?: string;
  errors?: FieldErrors;
  values?: ProgramContentFormValues;
};

export type FaqActionState = {
  ok: boolean;
  formError?: string;
  errors?: FieldErrors;
  values?: FaqFormValues;
};

export type GuideActionState = {
  ok: boolean;
  formError?: string;
  errors?: FieldErrors;
  values?: GuideFormValues;
};

export type HomepageFeatureActionState = {
  ok: boolean;
  formError?: string;
  errors?: FieldErrors;
};

export type LoginActionState = {
  ok: boolean;
  error?: string;
};

function safeAdminPath(from: string | null): string {
  if (from && from.startsWith("/admin") && !from.startsWith("//")) {
    return from;
  }
  return "/admin";
}

export async function loginAction(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  if (!adminPasswordConfigured()) {
    return { ok: false, error: "Admin is not configured on this server." };
  }

  const password = formData.get("password");
  if (typeof password !== "string" || password.length === 0) {
    return { ok: false, error: "Password is required." };
  }

  if (!verifyAdminPassword(password)) {
    return { ok: false, error: "Incorrect password." };
  }

  await createAdminSession();
  redirect(safeAdminPath(readOptional(formData, "from")));
}

export async function logoutAction(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}

export async function createProgramAction(
  _prev: ProgramActionState,
  formData: FormData,
): Promise<ProgramActionState> {
  await requireAdminSession();
  const values = programFormFromData(formData);
  const parsed = validateProgramForm(values);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors, values };
  }

  const saved = await saveNewProgram(parsed.data, {
    slugIsTaken,
    createProgram: async (payload) => {
      const created = await createProgram(payload);
      return { id: created.id, slug: created.slug };
    },
  });
  if (!saved.ok) {
    return {
      ok: false,
      errors: saved.errors,
      formError: saved.formError,
      values,
    };
  }

  revalidateAdminAndPublic(saved.program.slug);
  redirect(`/admin/programs/${saved.program.id}`);
}

export async function updateProgramAction(
  programId: string,
  _prev: ProgramActionState,
  formData: FormData,
): Promise<ProgramActionState> {
  await requireAdminSession();
  const values = programFormFromData(formData);
  const parsed = validateProgramForm(values);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors, values };
  }

  try {
    if (await slugIsTaken(parsed.data.slug, programId)) {
      return {
        ok: false,
        errors: { slug: "That slug is already in use." },
        values,
      };
    }
    const updated = await updateProgram(programId, parsed.data);
    revalidateAdminAndPublic(updated.slug, programId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      formError: error instanceof Error ? error.message : "Could not save program.",
      values,
    };
  }
}

export async function addRuleAction(
  programId: string,
  _prev: RelatedActionState,
  formData: FormData,
): Promise<RelatedActionState> {
  await requireAdminSession();
  const parsed = validateRuleForm(ruleFormFromData(formData));
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors };
  }
  try {
    await insertRule({ ...parsed.data, program_id: programId });
    revalidateAdminProgram(programId);
    return { ok: true };
  } catch (error) {
    return relatedError(error);
  }
}

export async function updateRuleAction(
  programId: string,
  ruleId: string,
  _prev: RelatedActionState,
  formData: FormData,
): Promise<RelatedActionState> {
  await requireAdminSession();
  const parsed = validateRuleForm(ruleFormFromData(formData));
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors };
  }
  try {
    await updateRule(ruleId, programId, parsed.data);
    revalidateAdminProgram(programId);
    return { ok: true };
  } catch (error) {
    return relatedError(error);
  }
}

export async function deleteRuleAction(
  programId: string,
  ruleId: string,
): Promise<void> {
  await requireAdminSession();
  await deleteRule(ruleId, programId);
  revalidateAdminProgram(programId);
}

export async function addLocationAction(
  programId: string,
  _prev: RelatedActionState,
  formData: FormData,
): Promise<RelatedActionState> {
  await requireAdminSession();
  const parsed = validateLocationForm(locationFormFromData(formData));
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors };
  }
  try {
    await insertLocation({ ...parsed.data, program_id: programId });
    revalidateAdminProgram(programId);
    return { ok: true };
  } catch (error) {
    return relatedError(error);
  }
}

export async function updateLocationAction(
  programId: string,
  locationId: string,
  _prev: RelatedActionState,
  formData: FormData,
): Promise<RelatedActionState> {
  await requireAdminSession();
  const parsed = validateLocationForm(locationFormFromData(formData));
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors };
  }
  try {
    await updateLocation(locationId, programId, parsed.data);
    revalidateAdminProgram(programId);
    return { ok: true };
  } catch (error) {
    return relatedError(error);
  }
}

export async function deleteLocationAction(
  programId: string,
  locationId: string,
): Promise<void> {
  await requireAdminSession();
  await deleteLocation(locationId, programId);
  revalidateAdminProgram(programId);
}

export async function addSourceAction(
  programId: string,
  _prev: RelatedActionState,
  formData: FormData,
): Promise<RelatedActionState> {
  await requireAdminSession();
  const parsed = validateSourceForm(sourceFormFromData(formData));
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors };
  }
  try {
    await insertSource({ ...parsed.data, program_id: programId });
    revalidateAdminProgram(programId);
    return { ok: true };
  } catch (error) {
    return relatedError(error);
  }
}

export async function updateSourceAction(
  programId: string,
  sourceId: string,
  _prev: RelatedActionState,
  formData: FormData,
): Promise<RelatedActionState> {
  await requireAdminSession();
  const parsed = validateSourceForm(sourceFormFromData(formData));
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors };
  }
  try {
    await updateSource(sourceId, programId, parsed.data);
    revalidateAdminProgram(programId);
    return { ok: true };
  } catch (error) {
    return relatedError(error);
  }
}

export async function deleteSourceAction(
  programId: string,
  sourceId: string,
): Promise<void> {
  await requireAdminSession();
  await deleteSource(sourceId, programId);
  revalidateAdminProgram(programId);
}

export async function updateProgramContentAction(
  programId: string,
  programSlug: string,
  _prev: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  await requireAdminSession();
  const values = contentFormFromData(formData);
  const parsed = validateContentForm(values);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors, values };
  }
  try {
    await upsertProgramContent(programId, parsed.data);
    revalidateAdminAndPublic(programSlug, programId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      formError: error instanceof Error ? error.message : "Could not save content.",
      values,
    };
  }
}

export async function addFaqAction(
  programId: string,
  programSlug: string,
  _prev: FaqActionState,
  formData: FormData,
): Promise<FaqActionState> {
  await requireAdminSession();
  const values = faqFormFromData(formData);
  const parsed = validateFaqForm(values);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors, values };
  }
  try {
    await insertFaq(programId, parsed.data);
    revalidateAdminAndPublic(programSlug, programId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      formError: error instanceof Error ? error.message : "Could not add FAQ.",
      values,
    };
  }
}

export async function updateFaqAction(
  programId: string,
  programSlug: string,
  faqId: string,
  _prev: FaqActionState,
  formData: FormData,
): Promise<FaqActionState> {
  await requireAdminSession();
  const values = faqFormFromData(formData);
  const parsed = validateFaqForm(values);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors, values };
  }
  try {
    await updateFaq(faqId, programId, parsed.data);
    revalidateAdminAndPublic(programSlug, programId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      formError: error instanceof Error ? error.message : "Could not save FAQ.",
      values,
    };
  }
}

export async function deleteFaqAction(
  programId: string,
  programSlug: string,
  faqId: string,
): Promise<void> {
  await requireAdminSession();
  await deleteFaq(faqId, programId);
  revalidateAdminAndPublic(programSlug, programId);
}

export async function updateHomepageFeatureAction(
  programId: string,
  _prev: HomepageFeatureActionState,
  formData: FormData,
): Promise<HomepageFeatureActionState> {
  await requireAdminSession();
  const values = homepageFeatureFormFromData(formData);
  values.program_id = programId;
  const parsed = validateHomepageFeatureForm(values);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors };
  }
  try {
    if (parsed.data.featured) {
      const featured = await featureProgramOnHomepage(
        parsed.data.program_id,
        parsed.data.sort_order,
        {
          loadProgram: getProgramStatusForHomepageFeature,
          upsertHomepageFeature,
        },
      );
      if (!featured.ok) {
        return { ok: false, formError: featured.formError };
      }
    } else {
      await deleteHomepageFeature(programId);
    }
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath(`/admin/programs/${programId}`);
    revalidatePath("/admin/homepage");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      formError:
        error instanceof Error ? error.message : "Could not update homepage feature.",
    };
  }
}

export async function addHomepageFeatureAction(
  _prev: HomepageFeatureActionState,
  formData: FormData,
): Promise<HomepageFeatureActionState> {
  await requireAdminSession();
  const values = homepageFeatureFormFromData(formData);
  values.featured = true;
  const parsed = validateHomepageFeatureForm(values);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors };
  }
  try {
    if (parsed.data.featured) {
      const featured = await featureProgramOnHomepage(
        parsed.data.program_id,
        parsed.data.sort_order,
        {
          loadProgram: getProgramStatusForHomepageFeature,
          upsertHomepageFeature,
        },
      );
      if (!featured.ok) {
        return { ok: false, formError: featured.formError };
      }
    }
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/homepage");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      formError:
        error instanceof Error ? error.message : "Could not feature program.",
    };
  }
}

export async function removeHomepageFeatureAction(programId: string): Promise<void> {
  await requireAdminSession();
  await deleteHomepageFeature(programId);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/homepage");
  revalidatePath(`/admin/programs/${programId}`);
}

export async function createGuideAction(
  _prev: GuideActionState,
  formData: FormData,
): Promise<GuideActionState> {
  await requireAdminSession();
  const values = guideFormFromData(formData);
  const parsed = validateGuideForm(values);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors, values };
  }

  const saved = await saveNewGuide(parsed.data, parsed.relatedProgramIds, {
    slugIsTaken: guideSlugIsTaken,
    createGuide: async (payload) => {
      const created = await createGuide(payload);
      return { id: created.id, slug: created.slug };
    },
    replaceGuidePrograms,
  });
  if (!saved.ok) {
    return {
      ok: false,
      errors: saved.errors,
      formError: saved.formError,
      values,
    };
  }

  revalidateGuides(saved.guide.slug);
  redirect(`/admin/guides/${saved.guide.id}`);
}

export async function updateGuideAction(
  guideId: string,
  _prev: GuideActionState,
  formData: FormData,
): Promise<GuideActionState> {
  await requireAdminSession();
  const values = guideFormFromData(formData);
  const parsed = validateGuideForm(values);
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors, values };
  }

  try {
    if (await guideSlugIsTaken(parsed.data.slug, guideId)) {
      return {
        ok: false,
        errors: { slug: "That slug is already in use." },
        values,
      };
    }
    const updated = await updateGuide(guideId, parsed.data);
    await replaceGuidePrograms(guideId, parsed.relatedProgramIds);
    revalidateGuides(updated.slug, guideId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      formError: error instanceof Error ? error.message : "Could not save guide.",
      values,
    };
  }
}

function revalidateAdminAndPublic(slug: string, programId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/programs");
  revalidatePath("/admin/homepage");
  revalidatePath("/programs");
  revalidatePath(`/programs/${slug}`);
  revalidatePath("/");
  if (programId) {
    revalidatePath(`/admin/programs/${programId}`);
  }
}

function revalidateGuides(slug?: string, guideId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/guides");
  revalidatePath("/guides");
  if (slug) {
    revalidatePath(`/guides/${slug}`);
  }
  if (guideId) {
    revalidatePath(`/admin/guides/${guideId}`);
  }
}

function revalidateAdminProgram(programId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/programs");
  revalidatePath(`/admin/programs/${programId}`);
}

export async function addFollowupQuestionAction(
  programId: string,
  _prev: RelatedActionState,
  formData: FormData,
): Promise<RelatedActionState> {
  await requireAdminSession();
  const parsed = validateFollowupQuestionForm(followupQuestionFormFromData(formData));
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors };
  }
  try {
    await insertFollowupQuestion({ ...parsed.data, program_id: programId });
    revalidateAdminProgram(programId);
    return { ok: true };
  } catch (error) {
    return relatedError(error);
  }
}

export async function updateFollowupQuestionAction(
  programId: string,
  questionId: string,
  _prev: RelatedActionState,
  formData: FormData,
): Promise<RelatedActionState> {
  await requireAdminSession();
  const parsed = validateFollowupQuestionForm(followupQuestionFormFromData(formData));
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors };
  }
  try {
    await updateFollowupQuestion(questionId, programId, parsed.data);
    revalidateAdminProgram(programId);
    return { ok: true };
  } catch (error) {
    return relatedError(error);
  }
}

export async function deleteFollowupQuestionAction(
  programId: string,
  questionId: string,
): Promise<void> {
  await requireAdminSession();
  await deleteFollowupQuestion(questionId, programId);
  revalidateAdminProgram(programId);
}

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

function relatedError(error: unknown): RelatedActionState {
  return {
    ok: false,
    formError: error instanceof Error ? error.message : "Save failed.",
  };
}

function readOptional(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}
