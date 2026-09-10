import { emptyToNull } from "@/lib/content/editorial";
import {
  parseOptionalNumber,
  type FieldErrors,
} from "@/lib/admin/validate-program";
import {
  CONTENT_BRIEF_TYPES,
  DEFAULT_SEO_PROVIDER,
  type ContentBriefInsert,
  type ContentBriefType,
} from "@/types/database";

export const SEO_PROVIDER_PATTERN = /^[a-z][a-z0-9_-]{0,31}$/;

export type ContentBriefFormValues = {
  primary_keyword: string;
  secondary_keywords: string;
  search_intent: string;
  questions_to_answer: string;
  topics_to_cover: string;
  suggested_title: string;
  suggested_meta_description: string;
  competitor_notes: string;
  research_notes: string;
  seo_provider: string;
  provider_document_id: string;
  provider_score: string;
  researched_at: string;
};

export type ContentBriefOwner = {
  contentType: ContentBriefType;
  programId?: string;
  guideId?: string;
};

export type ContentBriefWritePayload = Omit<
  ContentBriefInsert,
  "id" | "created_at" | "updated_at"
>;

export type ContentBriefValidationResult =
  | { ok: true; data: ContentBriefWritePayload }
  | { ok: false; errors: FieldErrors };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function emptyContentBriefFormValues(): ContentBriefFormValues {
  return {
    primary_keyword: "",
    secondary_keywords: "",
    search_intent: "",
    questions_to_answer: "",
    topics_to_cover: "",
    suggested_title: "",
    suggested_meta_description: "",
    competitor_notes: "",
    research_notes: "",
    seo_provider: DEFAULT_SEO_PROVIDER,
    provider_document_id: "",
    provider_score: "",
    researched_at: "",
  };
}

export function contentBriefFormFromData(formData: FormData): ContentBriefFormValues {
  return {
    primary_keyword: readString(formData, "primary_keyword"),
    secondary_keywords: readString(formData, "secondary_keywords"),
    search_intent: readString(formData, "search_intent"),
    questions_to_answer: readString(formData, "questions_to_answer"),
    topics_to_cover: readString(formData, "topics_to_cover"),
    suggested_title: readString(formData, "suggested_title"),
    suggested_meta_description: readString(formData, "suggested_meta_description"),
    competitor_notes: readString(formData, "competitor_notes"),
    research_notes: readString(formData, "research_notes"),
    seo_provider: readString(formData, "seo_provider"),
    provider_document_id: readString(formData, "provider_document_id"),
    provider_score: readString(formData, "provider_score"),
    researched_at: readString(formData, "researched_at"),
  };
}

export function isContentBriefType(value: string): value is ContentBriefType {
  return (CONTENT_BRIEF_TYPES as readonly string[]).includes(value);
}

export function normalizeSeoProvider(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  return trimmed === "" ? DEFAULT_SEO_PROVIDER : trimmed;
}

export function isSafeSeoProvider(value: string): boolean {
  return SEO_PROVIDER_PATTERN.test(value);
}

export function parseKeywordList(raw: string): string[] {
  return uniqueNonEmpty(raw.split(/[\n,]/).map((item) => item.trim()));
}

export function parseNewlineList(raw: string): string[] {
  return uniqueNonEmpty(raw.split("\n").map((item) => item.trim()));
}

export function validateContentBriefOwnership(
  owner: ContentBriefOwner,
): { ok: true } | { ok: false; error: string } {
  if (owner.contentType === "PROGRAM") {
    if (!owner.programId || !UUID_PATTERN.test(owner.programId) || owner.guideId) {
      return {
        ok: false,
        error: "A PROGRAM brief must belong to a program and not a guide.",
      };
    }
    return { ok: true };
  }
  if (owner.contentType === "GUIDE") {
    if (!owner.guideId || !UUID_PATTERN.test(owner.guideId) || owner.programId) {
      return {
        ok: false,
        error: "A GUIDE brief must belong to a guide and not a program.",
      };
    }
    return { ok: true };
  }
  return { ok: false, error: "Content type must be PROGRAM or GUIDE." };
}

export function validateContentBriefForm(
  values: ContentBriefFormValues,
  owner: ContentBriefOwner,
): ContentBriefValidationResult {
  const errors: FieldErrors = {};
  const ownership = validateContentBriefOwnership(owner);
  if (!ownership.ok) {
    errors.content_type = ownership.error;
  }

  const suggestedTitle = values.suggested_title.trim();
  const suggestedMeta = values.suggested_meta_description.trim();
  if (suggestedTitle.length > 120) {
    errors.suggested_title = "Suggested title must be 120 characters or fewer.";
  }
  if (suggestedMeta.length > 320) {
    errors.suggested_meta_description =
      "Suggested meta description must be 320 characters or fewer.";
  }

  const seoProvider = normalizeSeoProvider(values.seo_provider);
  if (!isSafeSeoProvider(seoProvider)) {
    errors.seo_provider =
      "Provider must be a short identifier such as manual or frase (lowercase letters, numbers, hyphens, or underscores).";
  }

  const score = parseOptionalNumber(values.provider_score);
  if (!score.ok) {
    errors.provider_score = score.error;
  }

  const researchedAt = parseOptionalTimestamp(values.researched_at);
  if (!researchedAt.ok) {
    errors.researched_at = researchedAt.error;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      content_type: owner.contentType,
      program_id: owner.contentType === "PROGRAM" ? owner.programId ?? null : null,
      guide_id: owner.contentType === "GUIDE" ? owner.guideId ?? null : null,
      primary_keyword: emptyToNull(values.primary_keyword),
      secondary_keywords: parseKeywordList(values.secondary_keywords),
      search_intent: emptyToNull(values.search_intent),
      questions_to_answer: parseNewlineList(values.questions_to_answer),
      topics_to_cover: parseNewlineList(values.topics_to_cover),
      suggested_title: emptyToNull(suggestedTitle),
      suggested_meta_description: emptyToNull(suggestedMeta),
      competitor_notes: emptyToNull(values.competitor_notes),
      research_notes: emptyToNull(values.research_notes),
      seo_provider: seoProvider,
      provider_document_id: emptyToNull(values.provider_document_id),
      provider_score: score.ok ? score.value : null,
      researched_at: researchedAt.ok ? researchedAt.value : null,
    },
  };
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

function uniqueNonEmpty(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
