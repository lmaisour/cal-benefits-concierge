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
import { saveNewProgram } from "@/lib/admin/save-new-program";
import {
  programFormFromData,
  validateProgramForm,
  type FieldErrors,
  type ProgramFormValues,
} from "@/lib/admin/validate-program";
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

function revalidateAdminAndPublic(slug: string, programId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/programs");
  revalidatePath("/programs");
  revalidatePath(`/programs/${slug}`);
  if (programId) {
    revalidatePath(`/admin/programs/${programId}`);
  }
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

function readOptional(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}
