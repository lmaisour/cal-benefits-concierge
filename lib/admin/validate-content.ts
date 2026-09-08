import { emptyToNull } from "@/lib/content/editorial";
import type { FieldErrors } from "@/lib/admin/validate-program";
import type { ProgramContentInsert } from "@/types/database";

export type ProgramContentFormValues = {
  seo_title: string;
  meta_description: string;
  overview: string;
  benefit_explanation: string;
  how_to_apply: string;
  documents_needed: string;
  important_notes: string;
};

export type ProgramContentWritePayload = Omit<ProgramContentInsert, "program_id">;

export type ContentValidationResult =
  | { ok: true; data: ProgramContentWritePayload }
  | { ok: false; errors: FieldErrors };

export function emptyContentFormValues(): ProgramContentFormValues {
  return {
    seo_title: "",
    meta_description: "",
    overview: "",
    benefit_explanation: "",
    how_to_apply: "",
    documents_needed: "",
    important_notes: "",
  };
}

export function contentFormFromData(formData: FormData): ProgramContentFormValues {
  return {
    seo_title: readString(formData, "seo_title"),
    meta_description: readString(formData, "meta_description"),
    overview: readString(formData, "overview"),
    benefit_explanation: readString(formData, "benefit_explanation"),
    how_to_apply: readString(formData, "how_to_apply"),
    documents_needed: readString(formData, "documents_needed"),
    important_notes: readString(formData, "important_notes"),
  };
}

export function validateContentForm(
  values: ProgramContentFormValues,
): ContentValidationResult {
  const errors: FieldErrors = {};
  const seoTitle = values.seo_title.trim();
  const metaDescription = values.meta_description.trim();

  if (seoTitle.length > 120) {
    errors.seo_title = "SEO title must be 120 characters or fewer.";
  }
  if (metaDescription.length > 320) {
    errors.meta_description = "Meta description must be 320 characters or fewer.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      seo_title: emptyToNull(seoTitle),
      meta_description: emptyToNull(metaDescription),
      overview: emptyToNull(values.overview),
      benefit_explanation: emptyToNull(values.benefit_explanation),
      how_to_apply: emptyToNull(values.how_to_apply),
      documents_needed: emptyToNull(values.documents_needed),
      important_notes: emptyToNull(values.important_notes),
    },
  };
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
