import { describe, expect, it } from "vitest";
import { buildEvidencePackage } from "@/lib/content-pipeline/build-evidence-package";
import { discoverOpportunities } from "@/lib/content-pipeline/discover-opportunities";
import { FakeContentDraftProvider } from "@/lib/content-pipeline/generate-draft";
import { scoreOpportunity } from "@/lib/content-pipeline/score-opportunity";
import { validateDraft } from "@/lib/content-pipeline/validate-draft";
import type { ContentDraft, EvidencePackage } from "@/lib/content-pipeline/types";
import { makeRecord, NOW } from "./fixtures";

const knownRoutes = ["/", "/check", "/results", "/programs", "/guides", "/programs/test-home-rebate"];

async function validPair(record = makeRecord()) {
  const discovered = discoverOpportunities({ records: [record], now: NOW }).candidates[0];
  if (!discovered) {
    throw new Error("expected candidate");
  }
  const opportunity = scoreOpportunity(discovered, { now: NOW });
  const evidence = buildEvidencePackage(record, NOW);
  const draft = await new FakeContentDraftProvider().generateDraft({ evidence, opportunity });
  return { draft, evidence, opportunity };
}

function expectCode(draft: ContentDraft, evidence: EvidencePackage, code: string) {
  const result = validateDraft({
    draft,
    evidence,
    known_routes: knownRoutes,
    own_slug: "test-home-rebate",
    own_titles: [evidence.official_name],
  });
  expect(result.passed).toBe(false);
  expect(result.errors.some((error) => error.code === code)).toBe(true);
}

describe("validateDraft", () => {
  it("passes a fake-provider draft built from evidence", async () => {
    const { draft, evidence } = await validPair();
    const result = validateDraft({
      draft,
      evidence,
      known_routes: knownRoutes,
      own_slug: "test-home-rebate",
      own_titles: [evidence.official_name, evidence.consumer_headline ?? ""],
    });
    expect(result.passed).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("blocks a missing official source", async () => {
    const { draft, evidence } = await validPair();
    evidence.official_sources = [];
    expectCode(draft, evidence, "NO_OFFICIAL_SOURCE");
  });

  it("blocks a non-ACTIVE program", async () => {
    const { draft, evidence } = await validPair();
    evidence.status = "EXPIRED";
    expectCode(draft, evidence, "PROGRAM_NOT_ACTIVE");
  });

  it("blocks LOW confidence stated as definite", async () => {
    const { draft, evidence } = await validPair();
    evidence.confidence = "LOW";
    draft.overview += " The applicant is eligible and will receive the rebate.";
    expectCode(draft, evidence, "LOW_CONFIDENCE_DEFINITE");
  });

  it("blocks an unsupported dollar amount", async () => {
    const { draft, evidence } = await validPair();
    draft.what_you_get += " Households receive $999999.";
    expectCode(draft, evidence, "UNSUPPORTED_AMOUNT");
  });

  it("blocks an unsupported deadline", async () => {
    const { draft, evidence } = await validPair();
    evidence.deadline.application_deadline = null;
    evidence.deadline.effective_end = null;
    draft.overview += " The application deadline is January 1, 1999.";
    expectCode(draft, evidence, "UNSUPPORTED_DEADLINE");
  });

  it("blocks an unsupported eligibility claim", async () => {
    const { draft, evidence } = await validPair();
    draft.who_may_qualify += " Veterans automatically receive priority.";
    expectCode(draft, evidence, "UNSUPPORTED_ELIGIBILITY");
  });

  it("blocks expired or paused programs presented as active", async () => {
    const { draft, evidence } = await validPair();
    evidence.status = "PAUSED";
    draft.overview += " The program is now accepting applications.";
    expectCode(draft, evidence, "INACTIVE_PRESENTED_AS_ACTIVE");
  });

  it("blocks a loan framed as free savings", async () => {
    const record = makeRecord({
      program: {
        benefit_type: "LOAN",
        benefit_summary: "A repayable loan",
      },
    });
    const { draft, evidence } = await validPair(record);
    draft.what_you_get += " This will save you free money.";
    expectCode(draft, evidence, "LOAN_FRAMED_AS_SAVINGS");
  });

  it("blocks exhaustive-catalog language", async () => {
    const { draft, evidence } = await validPair();
    draft.overview = "This is every California program you need.";
    expectCode(draft, evidence, "EXHAUSTIVE_CATALOG_CLAIM");
  });

  it("blocks title language that overstates eligibility", async () => {
    const { draft, evidence } = await validPair();
    draft.seo_title = "You qualify for this rebate guaranteed";
    draft.h1 = "You qualify for this rebate guaranteed";
    expectCode(draft, evidence, "TITLE_OVERSTATES_ELIGIBILITY");
  });

  it("blocks definite you-qualify language", async () => {
    const { draft, evidence } = await validPair();
    draft.dek = "Good news: you qualify.";
    expectCode(draft, evidence, "DEFINITE_QUALIFY_LANGUAGE");
  });

  it("blocks unmapped claims", async () => {
    const { draft, evidence } = await validPair();
    draft.source_claims = [
      {
        claim_id: "invented",
        text: "Invented fact",
        evidence_path: "does.not.exist",
        source_url: "https://example.invalid/official",
        section: "overview",
      },
    ];
    expectCode(draft, evidence, "UNMAPPED_CLAIM");
  });

  it("blocks near-duplicate titles", async () => {
    const { draft, evidence } = await validPair();
    const result = validateDraft({
      draft,
      evidence,
      known_routes: knownRoutes,
      own_slug: "test-home-rebate",
      own_titles: [evidence.official_name],
      duplicates: {
        slugs: ["other-program"],
        titles: [draft.seo_title],
      },
    });
    expect(result.errors.some((error) => error.code === "NEAR_DUPLICATE_CONTENT")).toBe(true);
  });

  it("blocks required internal links to missing routes", async () => {
    const { draft, evidence } = await validPair();
    draft.suggested_internal_links = [
      { href: "/programs/does-not-exist", label: "Missing", required: true },
    ];
    expectCode(draft, evidence, "BROKEN_INTERNAL_LINK");
  });

  it("blocks a non-http source URL", async () => {
    const { draft, evidence } = await validPair();
    evidence.official_sources = [
      {
        url: "javascript:alert(1)",
        organization: "Bad",
        source_type: "GENERAL",
        verified_at: null,
        notes: null,
      },
    ];
    expectCode(draft, evidence, "INVALID_SOURCE_URL");
  });

  it("blocks stale time-sensitive evidence", async () => {
    const { draft, evidence } = await validPair();
    evidence.freshness.is_stale = true;
    expectCode(draft, evidence, "STALE_TIME_SENSITIVE");
  });

  it("fails an unmapped factual sentence even when another valid source_claim exists", async () => {
    const { draft, evidence } = await validPair();
    expect(draft.source_claims.length).toBeGreaterThan(0);
    draft.what_you_get += " Households also receive a secret extra award.";
    const result = validateDraft({
      draft,
      evidence,
      known_routes: knownRoutes,
      own_slug: "test-home-rebate",
      own_titles: [evidence.official_name],
    });
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "UNMAPPED_CLAIM")).toBe(true);
  });

  it("fails an unmapped factual sentence in meta_description even when body claims are valid", async () => {
    const { draft, evidence } = await validPair();
    draft.meta_description += " Applicants receive a guaranteed $9,999 award.";
    const result = validateDraft({
      draft,
      evidence,
      known_routes: knownRoutes,
      own_slug: "test-home-rebate",
      own_titles: [evidence.official_name],
    });
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "UNMAPPED_CLAIM")).toBe(true);
    expect(
      result.errors.some((error) =>
        error.message.includes("meta_description"),
      ),
    ).toBe(true);
  });

  it("fails unsupported eligibility or value language inserted into h1", async () => {
    const { draft, evidence } = await validPair();
    draft.h1 += " — veterans automatically qualify for $12,000";
    const result = validateDraft({
      draft,
      evidence,
      known_routes: knownRoutes,
      own_slug: "test-home-rebate",
      own_titles: [evidence.official_name],
    });
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "UNMAPPED_CLAIM")).toBe(true);
    expect(result.errors.some((error) => error.message.includes("h1"))).toBe(true);
  });

  it("fails unsupported factual language in seo_title", async () => {
    const { draft, evidence } = await validPair();
    draft.seo_title += ": every California resident is eligible";
    const result = validateDraft({
      draft,
      evidence,
      known_routes: knownRoutes,
      own_slug: "test-home-rebate",
      own_titles: [evidence.official_name],
    });
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "UNMAPPED_CLAIM")).toBe(true);
    expect(
      result.errors.some((error) => error.message.includes("seo_title")),
    ).toBe(true);
  });

  it("blocks silent omission of unmodeled required criteria", async () => {
    const record = makeRecord({
      program: {
        has_unmodeled_required_criteria: true,
        unmodeled_required_criteria_summary: "Primary applicant must be head of household.",
      },
    });
    const { draft, evidence } = await validPair(record);
    draft.who_may_qualify = "Income limits may apply.";
    draft.important_notes = "Confirm details later.";
    draft.overview = "A rebate exists.";
    expectCode(draft, evidence, "UNMODELED_CRITERIA_OMITTED");
  });
});
