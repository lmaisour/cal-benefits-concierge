import type { EditorialContent, EditorialFaq } from "@/lib/content-pipeline/types";

const REQUIRED_GOLD_FIELDS: (keyof EditorialContent)[] = [
  "seo_title",
  "meta_description",
  "overview",
  "benefit_explanation",
  "how_to_apply",
  "important_notes",
];

function filled(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function isGoldStandardEditorial(
  content: EditorialContent | null | undefined,
  faqs: EditorialFaq[] | null | undefined,
): boolean {
  if (!content) {
    return false;
  }
  const requiredFilled = REQUIRED_GOLD_FIELDS.every((field) => filled(content[field]));
  return requiredFilled && (faqs?.length ?? 0) >= 3;
}

export function missingEditorialFields(content: EditorialContent | null | undefined): string[] {
  if (!content) {
    return [...REQUIRED_GOLD_FIELDS];
  }
  return REQUIRED_GOLD_FIELDS.filter((field) => !filled(content[field]));
}
