import type { Program, ProgramContent } from "@/types/program";

export function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function editorialOverview(
  program: Program,
  content: ProgramContent | null,
): string | null {
  return content?.overview ?? program.short_description ?? program.description;
}

export function editorialBenefit(
  program: Program,
  content: ProgramContent | null,
): string | null {
  return content?.benefit_explanation ?? program.benefit_summary;
}

export function editorialMetaDescription(
  program: Program,
  content: ProgramContent | null,
): string {
  return (
    content?.meta_description ??
    program.short_description ??
    program.benefit_summary ??
    program.description ??
    `Learn how ${program.name} works, who may qualify, and how to apply.`
  );
}

export function editorialSeoTitle(
  program: Program,
  content: ProgramContent | null,
): string {
  return content?.seo_title ?? program.name;
}
