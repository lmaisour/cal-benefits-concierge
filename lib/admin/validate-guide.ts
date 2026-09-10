import { emptyToNull } from "@/lib/content/editorial";
import type { FieldErrors } from "@/lib/admin/validate-program";
import type { GuideInsert } from "@/types/database";

export type GuideFormValues = {
  title: string;
  slug: string;
  seo_title: string;
  meta_description: string;
  excerpt: string;
  body: string;
  published: boolean;
  published_at: string;
  related_program_ids: string[];
};

export type GuideWritePayload = Omit<GuideInsert, "id" | "created_at" | "updated_at">;

export type GuideValidationResult =
  | { ok: true; data: GuideWritePayload; relatedProgramIds: string[] }
  | { ok: false; errors: FieldErrors };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function emptyGuideFormValues(): GuideFormValues {
  return {
    title: "",
    slug: "",
    seo_title: "",
    meta_description: "",
    excerpt: "",
    body: "",
    published: false,
    published_at: "",
    related_program_ids: [],
  };
}

export function guideFormFromData(formData: FormData): GuideFormValues {
  const related = formData
    .getAll("related_program_ids")
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  return {
    title: readString(formData, "title"),
    slug: readString(formData, "slug"),
    seo_title: readString(formData, "seo_title"),
    meta_description: readString(formData, "meta_description"),
    excerpt: readString(formData, "excerpt"),
    body: readString(formData, "body"),
    published: formData.get("published") === "true",
    published_at: readString(formData, "published_at"),
    related_program_ids: related,
  };
}

export function validateGuideForm(values: GuideFormValues): GuideValidationResult {
  const errors: FieldErrors = {};
  const title = values.title.trim();
  const slug = values.slug.trim().toLowerCase();
  const seoTitle = values.seo_title.trim();
  const metaDescription = values.meta_description.trim();

  if (!title) {
    errors.title = "Title is required.";
  }
  if (!slug) {
    errors.slug = "Slug is required.";
  } else if (!SLUG_PATTERN.test(slug)) {
    errors.slug =
      "Slug must be lowercase letters, numbers, and hyphens (e.g. how-to-apply).";
  }
  if (seoTitle.length > 120) {
    errors.seo_title = "SEO title must be 120 characters or fewer.";
  }
  if (metaDescription.length > 320) {
    errors.meta_description = "Meta description must be 320 characters or fewer.";
  }

  const publishedAt = parseOptionalPublishedAt(values.published_at);
  if (!publishedAt.ok) {
    errors.published_at = publishedAt.error;
  }

  const relatedProgramIds: string[] = [];
  const seen = new Set<string>();
  for (const id of values.related_program_ids) {
    if (!UUID_PATTERN.test(id)) {
      errors.related_program_ids = "Related programs must be valid program IDs.";
      break;
    }
    if (!seen.has(id)) {
      seen.add(id);
      relatedProgramIds.push(id);
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  let publishedAtValue = publishedAt.ok ? publishedAt.value : null;
  if (values.published && !publishedAtValue) {
    publishedAtValue = new Date().toISOString();
  }

  return {
    ok: true,
    data: {
      title,
      slug,
      seo_title: emptyToNull(seoTitle),
      meta_description: emptyToNull(metaDescription),
      excerpt: emptyToNull(values.excerpt),
      body: values.body,
      published: values.published,
      published_at: publishedAtValue,
    },
    relatedProgramIds,
  };
}

function parseOptionalPublishedAt(
  raw: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, value: null };
  }
  if (ISO_DATE_PATTERN.test(trimmed)) {
    const parsed = Date.parse(`${trimmed}T00:00:00.000Z`);
    if (Number.isNaN(parsed)) {
      return { ok: false, error: "Enter a valid published date." };
    }
    return { ok: true, value: new Date(parsed).toISOString() };
  }
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    return { ok: false, error: "Enter a valid published date." };
  }
  return { ok: true, value: new Date(parsed).toISOString() };
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
