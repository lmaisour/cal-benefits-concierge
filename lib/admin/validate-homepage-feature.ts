import { parseOptionalNumber, type FieldErrors } from "@/lib/admin/validate-program";

export type HomepageFeatureFormValues = {
  program_id: string;
  featured: boolean;
  sort_order: string;
};

export type HomepageFeatureWrite =
  | { featured: false }
  | { featured: true; program_id: string; sort_order: number };

export type HomepageFeatureValidationResult =
  | { ok: true; data: HomepageFeatureWrite }
  | { ok: false; errors: FieldErrors };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function homepageFeatureFormFromData(
  formData: FormData,
): HomepageFeatureFormValues {
  return {
    program_id: readString(formData, "program_id"),
    featured: formData.get("featured") === "true",
    sort_order: readString(formData, "sort_order") || "0",
  };
}

export function validateHomepageFeatureForm(
  values: HomepageFeatureFormValues,
): HomepageFeatureValidationResult {
  if (!values.featured) {
    return { ok: true, data: { featured: false } };
  }

  const errors: FieldErrors = {};
  if (!UUID_PATTERN.test(values.program_id)) {
    errors.program_id = "Select a program.";
  }

  const sortOrder = parseOptionalNumber(values.sort_order);
  if (!sortOrder.ok || sortOrder.value === null) {
    errors.sort_order = "Enter a display order number.";
  } else if (!Number.isInteger(sortOrder.value)) {
    errors.sort_order = "Display order must be a whole number.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      featured: true,
      program_id: values.program_id,
      sort_order: sortOrder.ok && sortOrder.value !== null ? sortOrder.value : 0,
    },
  };
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
