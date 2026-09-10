import { emptyToNull } from "@/lib/content/editorial";
import { isHttpUrl, type FieldErrors } from "@/lib/admin/validate-program";
import {
  CONFIDENCE_LEVELS,
  type Confidence,
  type ContentEvidenceInsert,
} from "@/types/database";

export type ContentEvidenceFormValues = {
  content_section: string;
  claim: string;
  source_url: string;
  source_title: string;
  source_publisher: string;
  source_date: string;
  verified_at: string;
  confidence: string;
  notes: string;
};

export type ContentEvidenceWritePayload = Omit<
  ContentEvidenceInsert,
  "id" | "program_id" | "created_at" | "updated_at"
>;

export type ContentEvidenceValidationResult =
  | { ok: true; data: ContentEvidenceWritePayload }
  | { ok: false; errors: FieldErrors };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function emptyContentEvidenceFormValues(): ContentEvidenceFormValues {
  return {
    content_section: "",
    claim: "",
    source_url: "",
    source_title: "",
    source_publisher: "",
    source_date: "",
    verified_at: "",
    confidence: "MEDIUM",
    notes: "",
  };
}

export function contentEvidenceFormFromData(
  formData: FormData,
): ContentEvidenceFormValues {
  return {
    content_section: readString(formData, "content_section"),
    claim: readString(formData, "claim"),
    source_url: readString(formData, "source_url"),
    source_title: readString(formData, "source_title"),
    source_publisher: readString(formData, "source_publisher"),
    source_date: readString(formData, "source_date"),
    verified_at: readString(formData, "verified_at"),
    confidence: readString(formData, "confidence"),
    notes: readString(formData, "notes"),
  };
}

export function isEvidenceConfidence(value: string): value is Confidence {
  return (CONFIDENCE_LEVELS as readonly string[]).includes(value);
}

export function validateHttpUrl(
  raw: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Source URL is required." };
  }
  if (!isHttpUrl(trimmed)) {
    return { ok: false, error: "Enter a valid http or https URL." };
  }
  return { ok: true, value: trimmed };
}

export function validateContentEvidenceForm(
  values: ContentEvidenceFormValues,
  programId: string,
): ContentEvidenceValidationResult {
  const errors: FieldErrors = {};
  if (!UUID_PATTERN.test(programId)) {
    errors.program_id = "Evidence must belong to a program.";
  }

  const section = values.content_section.trim();
  const claim = values.claim.trim();
  if (!section) {
    errors.content_section = "Section is required.";
  }
  if (!claim) {
    errors.claim = "Claim is required.";
  }

  const sourceUrl = validateHttpUrl(values.source_url);
  if (!sourceUrl.ok) {
    errors.source_url = sourceUrl.error;
  }

  if (!isEvidenceConfidence(values.confidence)) {
    errors.confidence = "Select HIGH, MEDIUM, or LOW.";
  }

  const sourceDate = parseOptionalDate(values.source_date);
  if (!sourceDate.ok) {
    errors.source_date = sourceDate.error;
  }

  const verifiedAt = parseOptionalTimestamp(values.verified_at);
  if (!verifiedAt.ok) {
    errors.verified_at = verifiedAt.error;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      content_section: section,
      claim,
      source_url: sourceUrl.ok ? sourceUrl.value : values.source_url.trim(),
      source_title: emptyToNull(values.source_title),
      source_publisher: emptyToNull(values.source_publisher),
      source_date: sourceDate.ok ? sourceDate.value : null,
      verified_at: verifiedAt.ok ? verifiedAt.value : null,
      confidence: values.confidence as Confidence,
      notes: emptyToNull(values.notes),
    },
  };
}

function parseOptionalDate(
  raw: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, value: null };
  }
  if (!ISO_DATE_PATTERN.test(trimmed) || Number.isNaN(Date.parse(`${trimmed}T00:00:00Z`))) {
    return { ok: false, error: "Enter a valid date." };
  }
  return { ok: true, value: trimmed };
}

function parseOptionalTimestamp(
  raw: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, value: null };
  }
  if (ISO_DATE_PATTERN.test(trimmed)) {
    const parsed = Date.parse(`${trimmed}T00:00:00.000Z`);
    if (Number.isNaN(parsed)) {
      return { ok: false, error: "Enter a valid date." };
    }
    return { ok: true, value: new Date(parsed).toISOString() };
  }
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    return { ok: false, error: "Enter a valid date." };
  }
  return { ok: true, value: new Date(parsed).toISOString() };
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
