import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProgramDeadlineCard } from "@/components/programs/deadline-card";
import { ProgramFactTable } from "@/components/programs/fact-table";
import { ProgramDetailView } from "@/components/programs/program-detail";
import { ProgramProcessTimeline } from "@/components/programs/process-timeline";
import { ProgramPurchaseTiming } from "@/components/programs/purchase-timing";
import { ProgramValueHero } from "@/components/programs/value-hero";
import {
  makeLocation,
  makeProgram,
  makeRule,
} from "@/lib/eligibility/__tests__/fixtures";
import { processTimelineSteps } from "@/lib/programs/process-timeline";
import type { ProgramDetail } from "@/lib/programs/get-program-by-slug";
import type { ProgramFaq, ProgramSource } from "@/types/program";

function makeFaq(programId: string): ProgramFaq {
  return {
    id: "faq-1",
    program_id: programId,
    question: "Do I apply on this site?",
    answer: "No. Use the official application linked on this page.",
    sort_order: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function makeSource(programId: string): ProgramSource {
  return {
    id: "source-1",
    program_id: programId,
    source_type: "ELIGIBILITY",
    organization: "Sample agency",
    url: "https://example.invalid/official",
    verified_at: "2026-08-01T00:00:00Z",
    notes: "Official eligibility page.",
    created_at: "2026-01-01T00:00:00Z",
  };
}

function makeDetail(overrides: Partial<ProgramDetail> = {}): ProgramDetail {
  const program = overrides.program ?? makeProgram();
  return {
    program,
    rules: overrides.rules ?? [],
    locations: overrides.locations ?? [],
    sources: overrides.sources ?? [makeSource(program.id)],
    related: overrides.related ?? [],
    content: overrides.content ?? null,
    faqs: overrides.faqs ?? [makeFaq(program.id)],
    relatedGuides: overrides.relatedGuides ?? [],
  };
}

function renderPage(detail: ProgramDetail): string {
  return renderToStaticMarkup(
    createElement(ProgramDetailView, {
      detail,
      seoTitle: `${detail.program.name} | Benefits Concierge`,
      seoDescription: "Learn who may qualify and how to apply.",
    }),
  );
}

describe("program detail visual composition", () => {
  it("server-renders core copy and JSON-LD without inventing unsupported visuals", () => {
    const program = makeProgram({
      name: "Sample rebate",
      slug: "sample-rebate",
      benefit_type: "REBATE",
      benefit_min: null,
      benefit_max: null,
      benefit_summary: "A long explanation that should not become a value hero.",
      purchase_before_approval_allowed: null,
      preapproval_required: null,
      effective_start: null,
      effective_end: null,
      has_unmodeled_required_criteria: true,
      unmodeled_required_criteria_summary: "Additional occupancy rules are not modeled.",
    });
    const html = renderPage(
      makeDetail({
        program,
        content: {
          program_id: program.id,
          seo_title: null,
          meta_description: null,
          overview: "Overview copy stays on the page.",
          benefit_explanation: "Benefit copy stays on the page.",
          how_to_apply: "Follow the official application.",
          documents_needed: "A government ID may be requested.",
          important_notes: "Confirm current rules before you apply.",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      }),
    );

    expect(html).toContain("Overview copy stays on the page.");
    expect(html).toContain("Benefit copy stays on the page.");
    expect(html).toContain("Follow the official application.");
    expect(html).toContain("A government ID may be requested.");
    expect(html).toContain("Confirm current rules before you apply.");
    expect(html).toContain("Do I apply on this site?");
    expect(html).toContain("Official sources");
    expect(html).toContain("https://example.invalid/official");
    expect(html).not.toContain("Purchase timing requirement is unclear");
    expect(html).not.toContain("Apply before you buy");
    expect(html).not.toContain("Purchase before approval appears allowed");
    expect(html).not.toContain("id=\"program-purchase-timing-heading\"");
    expect(html).toContain("Preapproval requirement is not clearly stated");
    expect(html).not.toContain("Up to $");
    expect(html).not.toContain("Current program period ends");
    expect(html).not.toContain("How the process works");
    expect(html).not.toContain("Application deadline");
    expect(html).not.toContain("Yard trees");
    expect(html).not.toContain("Income limits apply");
    expect(html).not.toMatch(/no income restriction/i);
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain('"@type":"WebPage"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain('"name":"Do I apply on this site?"');
  });

  it("renders value, deadline, eligibility, and purchase-warning visuals only from structured data", () => {
    const program = makeProgram({
      benefit_min: 1500,
      benefit_max: 3500,
      benefit_type: "REBATE",
      purchase_before_approval_allowed: false,
      effective_start: "2026-08-01",
      effective_end: "2031-09-01",
      statewide: false,
    });
    const html = renderPage(
      makeDetail({
        program,
        rules: [
          makeRule({
            program_id: program.id,
            field: "household_income",
            operator: "less_than_or_equal",
            value: 80000,
            explanation: "Household income must be at or below the sample threshold.",
          }),
        ],
        locations: [
          makeLocation({
            program_id: program.id,
            location_type: "COUNTY",
            location_value: "Los Angeles",
          }),
        ],
      }),
    );

    expect(html).toContain("Potential rebate");
    expect(html).toContain("$1,500–$3,500");
    expect(html).toContain("Current program period ends");
    expect(html).toContain("September 1, 2031");
    expect(html).toContain("Key eligibility facts");
    expect(html).toContain("Income limits apply");
    expect(html).toContain("Los Angeles County");
    expect(html).toContain("Apply before you buy");
    expect(html).toContain("Purchasing before approval may make you ineligible.");
    expect(html).toContain("At a glance");
    expect(html).not.toContain("How the process works");
    expect(html).not.toContain("Application deadline");
  });

  it("keeps loan value heroes from being labeled as savings in the page HTML", () => {
    const html = renderPage(
      makeDetail({
        program: makeProgram({
          benefit_type: "LOAN",
          benefit_min: 2000,
          benefit_max: 8000,
          purchase_before_approval_allowed: true,
          effective_end: null,
        }),
      }),
    );
    expect(html).toContain("Potential loan amount");
    expect(html).toContain("$2,000–$8,000");
    expect(html).toContain("Repayable — not free savings");
    expect(html).toContain("Purchase before approval appears allowed");
    expect(html).not.toContain("Potential rebate");
  });

  it("omits the top-page purchase timing card when the structured value is unknown", () => {
    const html = renderPage(
      makeDetail({
        program: makeProgram({
          purchase_before_approval_allowed: null,
          preapproval_required: true,
          effective_end: null,
        }),
      }),
    );
    expect(html).not.toContain("id=\"program-purchase-timing-heading\"");
    expect(html).not.toContain("Apply before you buy");
    expect(html).not.toContain("Purchase timing requirement is unclear");
    expect(html).not.toContain("Purchase before approval appears allowed");
    expect(html).toContain("Preapproval required");
  });
});

describe("visual primitive shells", () => {
  it("renders the deadline card from structured dates only", () => {
    const now = new Date(Date.UTC(2026, 8, 11, 16, 0, 0));
    const html = renderToStaticMarkup(
      createElement(ProgramDeadlineCard, {
        program: makeProgram({
          effective_start: null,
          effective_end: "2026-10-31",
        }),
        now,
      }),
    );
    expect(html).toContain("Current program period ends");
    expect(html).toContain("October 31, 2026");
    expect(html).toContain("50 days remaining");
    expect(html).toContain('dateTime="2026-10-31"');
    expect(html).not.toContain("Application deadline");
    expect(html).not.toContain('role="progressbar"');
  });

  it("omits the deadline card when a past end date contradicts ACTIVE status", () => {
    const now = new Date(Date.UTC(2026, 8, 11, 16, 0, 0));
    const html = renderToStaticMarkup(
      createElement(ProgramDeadlineCard, {
        program: makeProgram({
          status: "ACTIVE",
          effective_start: "2026-01-01",
          effective_end: "2026-06-30",
        }),
        now,
      }),
    );
    expect(html).toBe("");
  });

  it("omits the value hero when unsupported", () => {
    const html = renderToStaticMarkup(
      createElement(ProgramValueHero, {
        program: makeProgram({
          benefit_min: null,
          benefit_max: null,
          benefit_summary: "Too long and punctuated to use as a hero headline.",
        }),
      }),
    );
    expect(html).toBe("");
  });

  it("omits the purchase timing card when the structured value is unknown", () => {
    expect(
      renderToStaticMarkup(
        createElement(ProgramPurchaseTiming, {
          program: makeProgram({
            purchase_before_approval_allowed: null,
            preapproval_required: false,
          }),
        }),
      ),
    ).toBe("");
  });

  it("does not invent process steps from missing structured sequences", () => {
    expect(processTimelineSteps(null)).toBeNull();
    expect(processTimelineSteps([])).toBeNull();
    expect(
      renderToStaticMarkup(createElement(ProgramProcessTimeline, { steps: null })),
    ).toBe("");
    expect(
      renderToStaticMarkup(
        createElement(ProgramProcessTimeline, {
          steps: [{ title: "Submit the official application" }],
        }),
      ),
    ).toContain("How the process works");
  });

  it("renders a comparison table only when columns and rows are provided", () => {
    expect(
      renderToStaticMarkup(
        createElement(ProgramFactTable, { columns: ["A", "B"], rows: [] }),
      ),
    ).toBe("");
    const html = renderToStaticMarkup(
      createElement(ProgramFactTable, {
        caption: "Sample comparison",
        columns: ["Standard", "Income-qualified"],
        rows: [{ heading: "Benefit", values: ["$500", "$800"] }],
      }),
    );
    expect(html).toContain("<table");
    expect(html).toContain("Standard");
    expect(html).toContain("$800");
    expect(html).not.toContain("Yard trees");
    expect(html).not.toContain("Street trees");
  });
});
