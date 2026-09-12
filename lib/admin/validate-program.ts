import {
  ADMINISTRATOR_DISPLAY_NAME_MAX,
  AUDIENCE_TAG_MAX_COUNT,
  AUDIENCE_TAG_MAX_LENGTH,
  CONSUMER_HEADLINE_MAX,
  parseAudienceTagsInput,
} from "@/lib/programs/presentation";
import {
  BENEFIT_TYPES,
  CONFIDENCE_LEVELS,
  PROGRAM_STATUSES,
  type BenefitType,
  type Confidence,
  type ProgramInsert,
  type ProgramStatus,
} from "@/types/database";

export type FieldErrors = Record<string, string>;

export type ProgramFormValues = {
  name: string;
  slug: string;
  administrator: string;
  consumer_headline: string;
  administrator_display_name: string;
  audience_tags: string;
  category: string;
  subcategory: string;
  short_description: string;
  description: string;
  benefit_summary: string;
  benefit_type: string;
  benefit_min: string;
  benefit_max: string;
  benefit_period: string;
  status: string;
  official_url: string;
  application_url: string;
  statewide: boolean;
  preapproval_required: string;
  purchase_before_approval_allowed: string;
  effective_start: string;
  effective_end: string;
  application_deadline: string;
  last_verified_at: string;
  confidence: string;
  featured: boolean;
  active: boolean;
};

export type ProgramWritePayload = Pick<
  ProgramInsert,
  | "name"
  | "slug"
  | "administrator"
  | "consumer_headline"
  | "administrator_display_name"
  | "audience_tags"
  | "category"
  | "subcategory"
  | "short_description"
  | "description"
  | "benefit_summary"
  | "benefit_type"
  | "benefit_min"
  | "benefit_max"
  | "benefit_period"
  | "status"
  | "official_url"
  | "application_url"
  | "statewide"
  | "preapproval_required"
  | "purchase_before_approval_allowed"
  | "effective_start"
  | "effective_end"
  | "application_deadline"
  | "last_verified_at"
  | "confidence"
  | "featured"
  | "active"
>;

export type ProgramValidationResult =
  | { ok: true; data: ProgramWritePayload }
  | { ok: false; errors: FieldErrors };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NUMERIC_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

export function emptyProgramFormValues(): ProgramFormValues {
  return {
    name: "",
    slug: "",
    administrator: "",
    consumer_headline: "",
    administrator_display_name: "",
    audience_tags: "",
    category: "",
    subcategory: "",
    short_description: "",
    description: "",
    benefit_summary: "",
    benefit_type: "",
    benefit_min: "",
    benefit_max: "",
    benefit_period: "",
    status: "ACTIVE",
    official_url: "",
    application_url: "",
    statewide: false,
    preapproval_required: "",
    purchase_before_approval_allowed: "",
    effective_start: "",
    effective_end: "",
    application_deadline: "",
    last_verified_at: "",
    confidence: "",
    featured: false,
    active: true,
  };
}

export function programFormFromData(formData: FormData): ProgramFormValues {
  return {
    name: readString(formData, "name"),
    slug: readString(formData, "slug"),
    administrator: readString(formData, "administrator"),
    consumer_headline: readString(formData, "consumer_headline"),
    administrator_display_name: readString(formData, "administrator_display_name"),
    audience_tags: readString(formData, "audience_tags"),
    category: readString(formData, "category"),
    subcategory: readString(formData, "subcategory"),
    short_description: readString(formData, "short_description"),
    description: readString(formData, "description"),
    benefit_summary: readString(formData, "benefit_summary"),
    benefit_type: readString(formData, "benefit_type"),
    benefit_min: readString(formData, "benefit_min"),
    benefit_max: readString(formData, "benefit_max"),
    benefit_period: readString(formData, "benefit_period"),
    status: readString(formData, "status"),
    official_url: readString(formData, "official_url"),
    application_url: readString(formData, "application_url"),
    statewide: formData.get("statewide") === "true",
    preapproval_required: readString(formData, "preapproval_required"),
    purchase_before_approval_allowed: readString(
      formData,
      "purchase_before_approval_allowed",
    ),
    effective_start: readString(formData, "effective_start"),
    effective_end: readString(formData, "effective_end"),
    application_deadline: readString(formData, "application_deadline"),
    last_verified_at: readString(formData, "last_verified_at"),
    confidence: readString(formData, "confidence"),
    featured: formData.get("featured") === "true",
    active: formData.get("active") === "true",
  };
}

export function validateProgramForm(
  values: ProgramFormValues,
): ProgramValidationResult {
  const errors: FieldErrors = {};

  const name = values.name.trim();
  if (!name) {
    errors.name = "Name is required.";
  }

  const slug = values.slug.trim().toLowerCase();
  if (!slug) {
    errors.slug = "Slug is required.";
  } else if (!SLUG_PATTERN.test(slug)) {
    errors.slug =
      "Slug must be lowercase letters, numbers, and hyphens (e.g. my-program).";
  }

  const category = values.category.trim();
  if (!category) {
    errors.category = "Category is required.";
  }

  if (!isBenefitType(values.benefit_type)) {
    errors.benefit_type = "Select a valid benefit type.";
  }

  if (!isProgramStatus(values.status)) {
    errors.status = "Select a valid status.";
  }

  const benefitMin = parseOptionalNumber(values.benefit_min);
  if (benefitMin.ok === false) {
    errors.benefit_min = benefitMin.error;
  }

  const benefitMax = parseOptionalNumber(values.benefit_max);
  if (benefitMax.ok === false) {
    errors.benefit_max = benefitMax.error;
  }

  if (
    benefitMin.ok &&
    benefitMax.ok &&
    benefitMin.value !== null &&
    benefitMax.value !== null &&
    benefitMin.value > benefitMax.value
  ) {
    errors.benefit_max = "Maximum benefit cannot be less than the minimum.";
  }

  const officialUrl = parseOptionalUrl(values.official_url);
  if (officialUrl.ok === false) {
    errors.official_url = officialUrl.error;
  }

  const applicationUrl = parseOptionalUrl(values.application_url);
  if (applicationUrl.ok === false) {
    errors.application_url = applicationUrl.error;
  }

  const effectiveStart = parseOptionalDate(values.effective_start);
  if (effectiveStart.ok === false) {
    errors.effective_start = effectiveStart.error;
  }

  const effectiveEnd = parseOptionalDate(values.effective_end);
  if (effectiveEnd.ok === false) {
    errors.effective_end = effectiveEnd.error;
  }

  const applicationDeadline = parseOptionalDate(values.application_deadline);
  if (applicationDeadline.ok === false) {
    errors.application_deadline = applicationDeadline.error;
  }

  const lastVerified = parseOptionalTimestamp(values.last_verified_at);
  if (lastVerified.ok === false) {
    errors.last_verified_at = lastVerified.error;
  }

  const preapproval = parseNullableBoolean(values.preapproval_required);
  if (preapproval.ok === false) {
    errors.preapproval_required = preapproval.error;
  }

  const purchaseBefore = parseNullableBoolean(
    values.purchase_before_approval_allowed,
  );
  if (purchaseBefore.ok === false) {
    errors.purchase_before_approval_allowed = purchaseBefore.error;
  }

  const confidence = parseOptionalConfidence(values.confidence);
  if (confidence.ok === false) {
    errors.confidence = confidence.error;
  }

  const consumerHeadline = emptyToNull(values.consumer_headline);
  if (consumerHeadline && consumerHeadline.length > CONSUMER_HEADLINE_MAX) {
    errors.consumer_headline = `Keep the consumer headline to ${CONSUMER_HEADLINE_MAX} characters or fewer.`;
  }

  const administratorDisplayName = emptyToNull(values.administrator_display_name);
  if (
    administratorDisplayName &&
    administratorDisplayName.length > ADMINISTRATOR_DISPLAY_NAME_MAX
  ) {
    errors.administrator_display_name = `Keep the display name to ${ADMINISTRATOR_DISPLAY_NAME_MAX} characters or fewer.`;
  }

  const audienceTags = parseAudienceTagsInput(values.audience_tags);
  if (audienceTags.length > AUDIENCE_TAG_MAX_COUNT) {
    errors.audience_tags = `Use at most ${AUDIENCE_TAG_MAX_COUNT} audience tags.`;
  }
  if (audienceTags.some((tag) => tag.length > AUDIENCE_TAG_MAX_LENGTH)) {
    errors.audience_tags = `Each tag must be ${AUDIENCE_TAG_MAX_LENGTH} characters or fewer.`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      name,
      slug,
      administrator: emptyToNull(values.administrator),
      consumer_headline: consumerHeadline,
      administrator_display_name: administratorDisplayName,
      audience_tags: audienceTags.length > 0 ? audienceTags : null,
      category,
      subcategory: emptyToNull(values.subcategory),
      short_description: emptyToNull(values.short_description),
      description: emptyToNull(values.description),
      benefit_summary: emptyToNull(values.benefit_summary),
      benefit_type: values.benefit_type as BenefitType,
      benefit_min: benefitMin.ok ? benefitMin.value : null,
      benefit_max: benefitMax.ok ? benefitMax.value : null,
      benefit_period: emptyToNull(values.benefit_period),
      status: values.status as ProgramStatus,
      official_url: officialUrl.ok ? officialUrl.value : null,
      application_url: applicationUrl.ok ? applicationUrl.value : null,
      statewide: values.statewide,
      preapproval_required: preapproval.ok ? preapproval.value : null,
      purchase_before_approval_allowed: purchaseBefore.ok
        ? purchaseBefore.value
        : null,
      effective_start: effectiveStart.ok ? effectiveStart.value : null,
      effective_end: effectiveEnd.ok ? effectiveEnd.value : null,
      application_deadline: applicationDeadline.ok
        ? applicationDeadline.value
        : null,
      last_verified_at: lastVerified.ok ? lastVerified.value : null,
      confidence: confidence.ok ? confidence.value : null,
      featured: values.featured,
      active: values.active,
    },
  };
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseOptionalNumber(
  raw: string,
): { ok: true; value: number | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, value: null };
  }
  if (!NUMERIC_PATTERN.test(trimmed)) {
    return { ok: false, error: "Enter a valid number." };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { ok: false, error: "Enter a valid number." };
  }
  return { ok: true, value };
}

export function parseOptionalUrl(
  raw: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, value: null };
  }
  if (!isHttpUrl(trimmed)) {
    return {
      ok: false,
      error: "Enter a valid http or https URL.",
    };
  }
  return { ok: true, value: trimmed };
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

function parseNullableBoolean(
  raw: string,
): { ok: true; value: boolean | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, value: null };
  }
  if (trimmed === "true") {
    return { ok: true, value: true };
  }
  if (trimmed === "false") {
    return { ok: true, value: false };
  }
  return { ok: false, error: "Select yes, no, or not set." };
}

function parseOptionalConfidence(
  raw: string,
): { ok: true; value: Confidence | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, value: null };
  }
  if ((CONFIDENCE_LEVELS as readonly string[]).includes(trimmed)) {
    return { ok: true, value: trimmed as Confidence };
  }
  return { ok: false, error: "Select a valid confidence level." };
}

function isBenefitType(value: string): value is BenefitType {
  return (BENEFIT_TYPES as readonly string[]).includes(value);
}

function isProgramStatus(value: string): value is ProgramStatus {
  return (PROGRAM_STATUSES as readonly string[]).includes(value);
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
