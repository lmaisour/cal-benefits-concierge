import { emptyContentFormValues, type ProgramContentFormValues } from "@/lib/admin/validate-content";
import {
  emptyContentBriefFormValues,
  type ContentBriefFormValues,
} from "@/lib/admin/validate-content-brief";
import { emptyGuideFormValues, type GuideFormValues } from "@/lib/admin/validate-guide";
import { programNeedsReview } from "@/lib/admin/needs-review";
import { emptyProgramFormValues, type ProgramFormValues } from "@/lib/admin/validate-program";
import { DEFAULT_SEO_PROVIDER } from "@/types/database";
import type {
  ContentBrief,
  ContentEvidence,
  Guide,
  Program,
  ProgramContent,
  ProgramRelationship,
} from "@/types/program";

export type AdminRelatedProgram = {
  program: Pick<Program, "id" | "name" | "slug">;
  relationship: ProgramRelationship;
};

export function programToFormValues(program: Program): ProgramFormValues {
  return {
    ...emptyProgramFormValues(),
    name: program.name,
    slug: program.slug,
    administrator: program.administrator ?? "",
    category: program.category,
    subcategory: program.subcategory ?? "",
    short_description: program.short_description ?? "",
    description: program.description ?? "",
    benefit_summary: program.benefit_summary ?? "",
    benefit_type: program.benefit_type,
    benefit_min: program.benefit_min === null ? "" : String(program.benefit_min),
    benefit_max: program.benefit_max === null ? "" : String(program.benefit_max),
    benefit_period: program.benefit_period ?? "",
    status: program.status,
    official_url: program.official_url ?? "",
    application_url: program.application_url ?? "",
    statewide: program.statewide,
    preapproval_required: booleanSelect(program.preapproval_required),
    purchase_before_approval_allowed: booleanSelect(
      program.purchase_before_approval_allowed,
    ),
    effective_start: dateInput(program.effective_start),
    effective_end: dateInput(program.effective_end),
    application_deadline: dateInput(program.application_deadline),
    last_verified_at: dateInput(program.last_verified_at),
    confidence: program.confidence ?? "",
    featured: program.featured,
    active: program.active,
  };
}

export function contentToFormValues(
  content: ProgramContent | null,
): ProgramContentFormValues {
  if (!content) {
    return emptyContentFormValues();
  }
  return {
    seo_title: content.seo_title ?? "",
    meta_description: content.meta_description ?? "",
    overview: content.overview ?? "",
    benefit_explanation: content.benefit_explanation ?? "",
    how_to_apply: content.how_to_apply ?? "",
    documents_needed: content.documents_needed ?? "",
    important_notes: content.important_notes ?? "",
  };
}

export function contentBriefToFormValues(
  brief: ContentBrief | null,
): ContentBriefFormValues {
  if (!brief) {
    return emptyContentBriefFormValues();
  }
  return {
    primary_keyword: brief.primary_keyword ?? "",
    secondary_keywords: brief.secondary_keywords.join(", "),
    search_intent: brief.search_intent ?? "",
    questions_to_answer: brief.questions_to_answer.join("\n"),
    topics_to_cover: brief.topics_to_cover.join("\n"),
    suggested_title: brief.suggested_title ?? "",
    suggested_meta_description: brief.suggested_meta_description ?? "",
    competitor_notes: brief.competitor_notes ?? "",
    research_notes: brief.research_notes ?? "",
    seo_provider: brief.seo_provider || DEFAULT_SEO_PROVIDER,
    provider_document_id: brief.provider_document_id ?? "",
    provider_score: brief.provider_score === null ? "" : String(brief.provider_score),
    researched_at: dateInput(brief.researched_at),
  };
}

export function contentEvidenceToFormValues(evidence: ContentEvidence): {
  content_section: string;
  claim: string;
  source_url: string;
  source_title: string;
  source_publisher: string;
  source_date: string;
  verified_at: string;
  confidence: string;
  notes: string;
} {
  return {
    content_section: evidence.content_section,
    claim: evidence.claim,
    source_url: evidence.source_url,
    source_title: evidence.source_title ?? "",
    source_publisher: evidence.source_publisher ?? "",
    source_date: dateInput(evidence.source_date),
    verified_at: dateInput(evidence.verified_at),
    confidence: evidence.confidence,
    notes: evidence.notes ?? "",
  };
}

export function guideToFormValues(
  guide: Guide,
  relatedProgramIds: string[],
): GuideFormValues {
  return {
    ...emptyGuideFormValues(),
    title: guide.title,
    slug: guide.slug,
    seo_title: guide.seo_title ?? "",
    meta_description: guide.meta_description ?? "",
    excerpt: guide.excerpt ?? "",
    body: guide.body,
    published: guide.published,
    published_at: dateInput(guide.published_at),
    related_program_ids: relatedProgramIds,
  };
}

export function formatAdminDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function reviewLabel(program: Program, nowMs = Date.now()): string {
  return programNeedsReview(program, nowMs) ? "Needs review" : "";
}

function booleanSelect(value: boolean | null): string {
  if (value === true) {
    return "true";
  }
  if (value === false) {
    return "false";
  }
  return "";
}

function dateInput(value: string | null): string {
  if (!value) {
    return "";
  }
  return value.slice(0, 10);
}
