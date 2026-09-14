import type { CatalogProgram, CatalogSource } from "@/lib/programs/import/types";
import type { DiscoveryRecord, EditorialContent, EditorialFaq } from "@/lib/content-pipeline/types";

export const NOW = new Date("2026-09-14T00:00:00.000Z");

export function makeCatalogProgram(
  overrides: Partial<CatalogProgram> = {},
): CatalogProgram {
  return {
    external_id: "TEST-REBATE-1",
    name: "Test Home Rebate",
    slug: "test-home-rebate",
    administrator: "Test Agency",
    consumer_headline: "A rebate for qualifying households",
    administrator_display_name: "Test Agency",
    consumer_tags: ["Homeowner"],
    category: "home-energy",
    subcategory: null,
    short_description: "A test rebate.",
    description: "A test rebate used only in pipeline fixtures.",
    benefit_summary: "A one-time rebate",
    benefit_type: "REBATE",
    benefit_min: 200,
    benefit_max: 500,
    benefit_period: "one_time",
    status: "ACTIVE",
    official_url: "https://example.invalid/official",
    application_url: "https://example.invalid/apply",
    statewide: true,
    preapproval_required: false,
    purchase_before_approval_allowed: true,
    effective_start: "2026-01-01",
    effective_end: null,
    application_deadline: "2026-11-01",
    last_verified_at: "2026-09-10T00:00:00.000Z",
    confidence: "HIGH",
    featured: false,
    active: true,
    has_unmodeled_required_criteria: false,
    unmodeled_required_criteria_summary: null,
    ...overrides,
  };
}

export function makeSource(
  programExternalId: string,
  overrides: Partial<CatalogSource> = {},
): CatalogSource {
  return {
    program_external_id: programExternalId,
    source_type: "GENERAL",
    organization: "Test Agency",
    url: "https://example.invalid/source",
    verified_at: "2026-09-10T00:00:00.000Z",
    notes: null,
    ...overrides,
  };
}

export function goldContent(): EditorialContent {
  return {
    seo_title: "Gold title",
    meta_description: "Gold meta",
    overview: "Gold overview",
    benefit_explanation: "Gold benefit",
    how_to_apply: "Gold apply",
    important_notes: "Gold notes",
  };
}

export function goldFaqs(): EditorialFaq[] {
  return [
    { question: "Q1", answer: "A1" },
    { question: "Q2", answer: "A2" },
    { question: "Q3", answer: "A3" },
  ];
}

export function makeRecord(
  overrides: {
    program?: Partial<CatalogProgram>;
    sources?: CatalogSource[];
    content?: EditorialContent | null;
    faqs?: EditorialFaq[];
  } = {},
): DiscoveryRecord {
  const program = makeCatalogProgram(overrides.program);
  return {
    program,
    rules: [
      {
        program_external_id: program.external_id,
        field: "household_income",
        operator: "less_than_or_equal",
        value: 80000,
        rule_group: 1,
        group_operator: "AND",
        required: true,
        explanation: "Household income may need to be at or below the published limit.",
      },
    ],
    locations: [
      {
        program_external_id: program.external_id,
        location_type: "STATE",
        location_value: "CA",
      },
    ],
    sources: overrides.sources ?? [
      makeSource(program.external_id),
    ],
    content: overrides.content === undefined ? null : overrides.content,
    faqs: overrides.faqs ?? [],
    brief: null,
    evidence_rows: [],
  };
}
