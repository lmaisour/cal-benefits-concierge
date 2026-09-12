import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProgramDetailView } from "@/components/programs/program-detail";
import {
  LEAP_OFFICIAL,
  LEAP_PAGE_HEADING,
  LEAP_SLUG,
  LEAP_TURF_REBATE_WARNING,
  leapContent,
  leapFaqs,
  leapStructuredPatch,
} from "@/data/content/ladwp-landscape-efficiency-assistance";
import { programCatalog } from "@/data/programs/index";
import {
  makeLocation,
  makeProgram,
  makeRule,
} from "@/lib/eligibility/__tests__/fixtures";
import { editorialMetaDescription, editorialSeoTitle } from "@/lib/content/editorial";
import { eligibilityHighlightFacts } from "@/lib/programs/eligibility-facts";
import { programSummaryFacts } from "@/lib/programs/summary-facts";
import type { ProgramDetail } from "@/lib/programs/get-program-by-slug";
import type { ProgramFaq, ProgramSource } from "@/types/program";

const catalogProgram = programCatalog.programs.find(
  (program) => program.slug === LEAP_SLUG,
);
if (!catalogProgram) {
  throw new Error("LEAP catalog program is missing.");
}
const leapCatalog = catalogProgram;

function leapDetail(): ProgramDetail {
  const program = makeProgram({
    id: "9cb236eb-f818-47c5-865c-aaa802e4d8bf",
    external_id: leapCatalog.external_id,
    name: leapCatalog.name,
    slug: leapCatalog.slug,
    administrator: leapCatalog.administrator,
    consumer_headline: leapCatalog.consumer_headline,
    administrator_display_name: leapCatalog.administrator_display_name,
    audience_tags: leapCatalog.audience_tags,
    category: leapCatalog.category,
    subcategory: leapCatalog.subcategory,
    short_description: leapCatalog.short_description,
    description: leapCatalog.description,
    benefit_summary: leapCatalog.benefit_summary,
    benefit_type: leapCatalog.benefit_type,
    benefit_min: leapCatalog.benefit_min,
    benefit_max: leapCatalog.benefit_max,
    benefit_period: leapCatalog.benefit_period,
    status: leapCatalog.status,
    official_url: leapCatalog.official_url,
    application_url: leapCatalog.application_url,
    statewide: leapCatalog.statewide,
    preapproval_required: leapCatalog.preapproval_required,
    purchase_before_approval_allowed: leapCatalog.purchase_before_approval_allowed,
    effective_start: leapCatalog.effective_start,
    effective_end: leapCatalog.effective_end,
    application_deadline: leapCatalog.application_deadline,
    last_verified_at: leapCatalog.last_verified_at,
    confidence: leapCatalog.confidence,
    active: leapCatalog.active,
    has_unmodeled_required_criteria: leapCatalog.has_unmodeled_required_criteria,
    unmodeled_required_criteria_summary:
      leapCatalog.unmodeled_required_criteria_summary,
  });

  const faqs: ProgramFaq[] = leapFaqs.map((faq, index) => ({
    id: `leap-faq-${index}`,
    program_id: program.id,
    question: faq.question,
    answer: faq.answer,
    sort_order: faq.sort_order,
    created_at: leapStructuredPatch.last_verified_at,
    updated_at: leapStructuredPatch.last_verified_at,
  }));

  const sources: ProgramSource[] = Object.entries(LEAP_OFFICIAL).map(
    ([key, url], index) => ({
      id: `leap-source-${index}`,
      program_id: program.id,
      source_type: key === "faq" || key === "terms" ? "ELIGIBILITY" : key === "main" ? "GENERAL" : "APPLICATION",
      organization: "LADWP",
      url,
      verified_at: leapStructuredPatch.last_verified_at,
      notes: null,
      created_at: leapStructuredPatch.last_verified_at,
    }),
  );

  return {
    program,
    rules: [
      makeRule({
        program_id: program.id,
        field: "property_type",
        operator: "equals",
        value: "single_family",
        explanation: "LEAP is published for qualifying single-family homes.",
      }),
    ],
    locations: [
      makeLocation({
        program_id: program.id,
        location_type: "STATE",
        location_value: "CA",
      }),
    ],
    sources,
    related: [],
    content: {
      program_id: program.id,
      seo_title: leapContent.seo_title,
      meta_description: leapContent.meta_description,
      overview: leapContent.overview,
      benefit_explanation: leapContent.benefit_explanation,
      how_to_apply: leapContent.how_to_apply,
      documents_needed: leapContent.documents_needed,
      important_notes: leapContent.important_notes,
      created_at: leapStructuredPatch.last_verified_at,
      updated_at: leapStructuredPatch.last_verified_at,
    },
    faqs,
    relatedGuides: [],
  };
}

function renderLeapPage(): string {
  const detail = leapDetail();
  return renderToStaticMarkup(
    createElement(ProgramDetailView, {
      detail,
      seoTitle: editorialSeoTitle(detail.program, detail.content),
      seoDescription: editorialMetaDescription(detail.program, detail.content),
    }),
  );
}

describe("LEAP program page content", () => {
  it("renders gold-standard sections, deadline, warning, FAQs, and official sources", () => {
    const html = renderLeapPage();
    expect(html).toContain("<h1");
    expect(html).toContain("Free front-yard landscaping");
    expect(html).toContain(leapStructuredPatch.name);
    expect(html).toContain("by LADWP");
    expect(html).toContain("Single-family home");
    expect(html).toContain("LADWP water");
    expect(html).toContain("Homeowner or renter");
    expect(html).not.toContain("Low income");
    expect(html).toContain(LEAP_PAGE_HEADING);
    expect(html).toContain("Application deadline: October 31, 2026");
    expect(html).toMatch(/application deadline/i);
    expect(html).not.toContain("Current program period ends");
    expect(html).toContain(LEAP_TURF_REBATE_WARNING);
    expect(html).toContain("No general household income limit is listed");
    expect(html).toContain("Renters are not categorically excluded");
    expect(html).toContain("Address-based DAC eligibility still needs confirmation");
    expect(html).toContain("cannot be saved");
    expect(html).toContain("Program summary");
    expect(html).toContain("Frequently asked questions");
    expect(html).toContain("Official sources");
    expect(html).toContain("Check what you qualify for");
    expect(html).toContain("Always confirm eligibility with the official program administrator.");
    for (const url of Object.values(LEAP_OFFICIAL)) {
      expect(html).toContain(url);
      expect(url.startsWith("https://")).toBe(true);
      expect(url).toContain("ladwp.com");
    }
    expect(leapFaqs).toHaveLength(13);
    for (const faq of leapFaqs) {
      expect(html).toContain(faq.question);
      expect(html).toContain(faq.answer.slice(0, 40));
    }
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).not.toMatch(/\$\d/);
    expect(html).not.toContain("Up to $");
    expect(html).not.toContain("Income limits apply");
    expect(html).not.toContain("Funding exhausted");
    expect(html).not.toMatch(/City of Los Angeles residents qualify/i);
    expect(html).not.toMatch(/All LADWP customers qualify/i);
    expect(html).not.toMatch(/Guaranteed free landscaping/i);
  });

  it("keeps DAC unresolved and does not invent income or homeowner facts", () => {
    const detail = leapDetail();
    expect(detail.program.has_unmodeled_required_criteria).toBe(true);
    expect(detail.program.unmodeled_required_criteria_summary).toBe(
      "You must live in a qualifying disadvantaged community. Address-based DAC eligibility is not confirmed here.",
    );
    const facts = eligibilityHighlightFacts(detail);
    expect(facts.some((fact) => fact.label === "Income")).toBe(false);
    expect(facts.some((fact) => fact.label === "Housing")).toBe(false);
    const summary = programSummaryFacts(detail);
    expect(summary.some((fact) => fact.label === "Income")).toBe(false);
    expect(summary.some((fact) => fact.label === "Housing")).toBe(false);
    expect(summary.find((fact) => fact.label === "Status")?.value).toBe("Active");
    const html = renderLeapPage();
    expect(html).toContain("Additional program requirements need to be confirmed.");
    expect(html).toContain(detail.program.unmodeled_required_criteria_summary);
    expect(html).not.toMatch(/disadvantaged community[\s\S]{0,40}passed/i);
  });

  it("does not store the application deadline on effective_end", () => {
    expect(leapCatalog.application_deadline).toBe("2026-10-31");
    expect(leapCatalog.effective_end).toBeNull();
    expect(leapStructuredPatch.application_deadline).toBe("2026-10-31");
    expect(leapStructuredPatch.effective_end).toBeNull();
    const html = renderLeapPage();
    expect(html).toContain("Application deadline: October 31, 2026");
    expect(html).not.toContain("Current program period ends");
    expect(html).not.toContain("Program period ended");
  });

  it("uses the provided SEO title and meta description", () => {
    const detail = leapDetail();
    expect(editorialSeoTitle(detail.program, detail.content)).toBe(leapContent.seo_title);
    expect(editorialMetaDescription(detail.program, detail.content)).toBe(
      leapContent.meta_description,
    );
  });
});
