import { describe, expect, it } from "vitest";
import { buildEvidencePackage } from "@/lib/content-pipeline/build-evidence-package";
import {
  AWARD_FRAMING_PATTERN,
  shouldIncludeAmountFaq,
} from "@/lib/content-pipeline/benefit-presentation";
import {
  claimIdsBySection,
  composeDraftFromSelectedClaimIds,
  LlmDraftProviderError,
} from "@/lib/content-pipeline/compose-selected-claims";
import { discoverOpportunities } from "@/lib/content-pipeline/discover-opportunities";
import {
  buildFactualClaims,
  FakeContentDraftProvider,
} from "@/lib/content-pipeline/generate-draft";
import { scoreOpportunity } from "@/lib/content-pipeline/score-opportunity";
import {
  GENERIC_SEQUENCING_COPY,
  VEHICLE_RETIREMENT_SEQUENCING_COPY,
} from "@/lib/content-pipeline/sequencing";
import { validateDraft } from "@/lib/content-pipeline/validate-draft";
import type { ContentDraft, EvidencePackage } from "@/lib/content-pipeline/types";
import { makeRecord, NOW } from "./fixtures";

const knownRoutes = [
  "/",
  "/check",
  "/results",
  "/programs",
  "/guides",
  "/programs/test-home-rebate",
];

async function pair(record = makeRecord()) {
  const discovered = discoverOpportunities({ records: [record], now: NOW }).candidates[0];
  if (!discovered) {
    throw new Error("expected candidate");
  }
  const opportunity = scoreOpportunity(discovered, { now: NOW });
  const evidence = buildEvidencePackage(record, NOW);
  const draft = await new FakeContentDraftProvider().generateDraft({ evidence, opportunity });
  return { draft, evidence, opportunity };
}

function validate(draft: ContentDraft, evidence: EvidencePackage) {
  return validateDraft({
    draft,
    evidence,
    known_routes: knownRoutes,
    own_slug: "test-home-rebate",
    own_titles: [evidence.official_name, evidence.consumer_headline ?? ""],
  });
}

function officialEvidenceRow(
  overrides: Partial<{
    content_section: string;
    claim: string;
    source_url: string;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    verified_at: string | null;
  }> = {},
) {
  return {
    content_section: "eligibility",
    claim: "The front yard must have 500 to 3,000 square feet of green grass.",
    source_url: "https://example.invalid/official",
    source_title: "Official page",
    source_publisher: "Test Agency",
    source_date: "2026-03-27",
    verified_at: "2026-09-12T00:00:00.000Z",
    confidence: "HIGH" as const,
    notes: null,
    ...overrides,
  };
}

describe("benefit-type presentation", () => {
  it("presents FREE_SERVICE without cash-award language or a how-much FAQ", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: {
          benefit_type: "FREE_SERVICE",
          consumer_headline: "Free front-yard landscaping",
          benefit_summary: "Free front-yard landscaping",
          benefit_min: null,
          benefit_max: null,
          short_description:
            "Qualifying water customers may receive free front-yard lawn replacement.",
        },
        content: {
          benefit_explanation:
            "If you may qualify, an assigned contractor can provide landscape design and construction at no cost to you.",
          how_to_apply: "Apply through the official account portal.",
          documents_needed: "Photos of the existing front yard.",
        },
      }),
    );
    expect(evidence.benefit.type).toBe("FREE_SERVICE");
    expect(draft.h1).toBe("Free front-yard landscaping");
    expect(draft.what_you_get).toMatch(/free service, not a cash award/i);
    expect(draft.what_you_get).toMatch(/landscape design and construction at no cost/);
    expect(draft.what_you_get).not.toMatch(AWARD_FRAMING_PATTERN);
    expect(draft.overview).not.toMatch(AWARD_FRAMING_PATTERN);
    expect(draft.faqs.some((faq) => faq.question === "How much could I receive?")).toBe(false);
    expect(draft.overview.match(/Free front-yard landscaping/g)?.length ?? 0).toBeLessThan(2);
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("presents FREE_PRODUCT without inventing a dollar award", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: {
          benefit_type: "FREE_PRODUCT",
          consumer_headline: "Free shade trees",
          benefit_summary: "Free shade trees",
          benefit_min: null,
          benefit_max: null,
        },
      }),
    );
    expect(draft.what_you_get).toMatch(/free product, not a cash award/i);
    expect(draft.what_you_get).not.toMatch(/\$/);
    expect(draft.faqs.some((faq) => /how much could i receive/i.test(faq.question))).toBe(
      false,
    );
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("keeps CASH TIERED as discrete awards", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: {
          benefit_type: "CASH",
          consumer_headline: null,
          benefit_min: 1350,
          benefit_max: 2000,
          benefit_amount_structure: "TIERED",
          benefit_tiers: [
            {
              amount: 1350,
              label: "$1,350 retirement award",
              condition_summary: "No household-income test.",
              evidence_path: "benefit.tiers.0",
            },
            {
              amount: 1500,
              label: "$1,500 retirement award",
              condition_summary: "Income documentation and a completed Smog Check.",
              evidence_path: "benefit.tiers.1",
            },
            {
              amount: 2000,
              label: "$2,000 retirement award",
              condition_summary: "Income documentation and a failed Smog Check.",
              evidence_path: "benefit.tiers.2",
            },
          ],
        },
      }),
    );
    expect(evidence.benefit.amount_structure).toBe("TIERED");
    expect(draft.what_you_get).toMatch(/\$1,350/);
    expect(draft.what_you_get).toMatch(/\$1,500/);
    expect(draft.what_you_get).toMatch(/\$2,000/);
    expect(draft.what_you_get).not.toMatch(/\$1,350 to \$2,000/);
    expect(draft.faqs.some((faq) => faq.question === "How much could I receive?")).toBe(true);
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("keeps a REBATE RANGE as a range and a REBATE SINGLE as a single amount", async () => {
    const range = await pair(
      makeRecord({
        program: {
          benefit_type: "REBATE",
          consumer_headline: null,
          benefit_min: 200,
          benefit_max: 500,
          benefit_amount_structure: "RANGE",
        },
      }),
    );
    expect(range.draft.what_you_get).toMatch(/\$200 to \$500/);
    expect(range.draft.faqs.some((faq) => faq.question === "How much could I receive?")).toBe(
      true,
    );
    expect(validate(range.draft, range.evidence).passed).toBe(true);

    const single = await pair(
      makeRecord({
        program: {
          benefit_type: "REBATE",
          consumer_headline: null,
          benefit_min: 1500,
          benefit_max: 1500,
          benefit_amount_structure: "SINGLE",
          benefit_summary: "A $1,500 rebate",
        },
      }),
    );
    expect(single.draft.what_you_get).toMatch(/\$1,500/);
    expect(single.draft.what_you_get).not.toMatch(/\$1,500 to /);
    expect(validate(single.draft, single.evidence).passed).toBe(true);
  });

  it("never presents LOAN or FINANCING as free savings", async () => {
    const loan = await pair(
      makeRecord({
        program: {
          benefit_type: "LOAN",
          benefit_summary: "A repayable loan",
          benefit_min: 50000,
          benefit_max: 50000,
          benefit_amount_structure: "SINGLE",
        },
      }),
    );
    expect(loan.draft.what_you_get).toMatch(/must be repaid/);
    expect(loan.draft.what_you_get).toMatch(/\$50,000/);
    expect(loan.draft.what_you_get).not.toMatch(/free savings|free cash|free money/i);
    expect(loan.draft.faqs.some((faq) => faq.question === "How much could I receive?")).toBe(
      false,
    );
    expect(loan.draft.faqs.some((faq) => faq.question === "How much financing is available?")).toBe(
      true,
    );
    const loanValidation = validate(loan.draft, loan.evidence);
    expect(loanValidation.errors).toEqual([]);
    expect(loanValidation.passed).toBe(true);

    const financing = await pair(
      makeRecord({
        program: {
          benefit_type: "FINANCING",
          benefit_summary: "On-bill financing",
          benefit_min: null,
          benefit_max: null,
        },
      }),
    );
    expect(financing.draft.what_you_get).toMatch(/financing, not a grant/i);
    expect(financing.draft.faqs.some((faq) => /how much could i receive/i.test(faq.question))).toBe(
      false,
    );
    expect(validate(financing.draft, financing.evidence).passed).toBe(true);
  });

  it("frames a FORGIVABLE_LOAN as conditional repayment, not free cash", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: {
          benefit_type: "FORGIVABLE_LOAN",
          benefit_summary: "A forgivable loan",
          benefit_min: null,
          benefit_max: null,
        },
      }),
    );
    expect(draft.what_you_get).toMatch(/forgivable loan/i);
    expect(draft.what_you_get).toMatch(/may need to be repaid/i);
    expect(draft.what_you_get).not.toMatch(/free savings|free money/i);
    expect(draft.what_you_get).toMatch(/not a grant or cash you keep/i);
    expect(draft.faqs.some((faq) => /how much could i receive/i.test(faq.question))).toBe(false);
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("does not invent award language for UNKNOWN OTHER benefits", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: {
          benefit_type: "OTHER",
          benefit_summary: "Program assistance",
          benefit_min: null,
          benefit_max: null,
          consumer_headline: null,
        },
      }),
    );
    expect(shouldIncludeAmountFaq("OTHER", "UNKNOWN")).toBe(false);
    expect(draft.what_you_get).not.toMatch(AWARD_FRAMING_PATTERN);
    expect(draft.faqs.some((faq) => /how much could i receive/i.test(faq.question))).toBe(false);
    expect(validate(draft, evidence).passed).toBe(true);
  });
});

describe("verified researched facts", () => {
  it("exposes HIGH-confidence official eligibility evidence, including grass area", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: {
          benefit_type: "FREE_SERVICE",
          consumer_headline: "Free front-yard landscaping",
          benefit_summary: "Free front-yard landscaping",
          benefit_min: null,
          benefit_max: null,
          has_unmodeled_required_criteria: true,
          unmodeled_required_criteria_summary:
            "You must live in a qualifying disadvantaged community. Address-based DAC eligibility is not confirmed here.",
        },
        rules: [
          {
            program_external_id: "TEST-REBATE-1",
            field: "property_type",
            operator: "equals",
            value: "single_family",
            rule_group: 1,
            group_operator: "AND",
            required: true,
            explanation: "LEAP is published for qualifying single-family homes.",
          },
        ],
        evidence_rows: [
          officialEvidenceRow(),
          officialEvidenceRow({
            claim: "The site address must currently be served by LADWP for water service.",
          }),
          officialEvidenceRow({
            content_section: "important_notes",
            claim:
              "The applicant must not have previously participated in the SoCalWaterSmart Turf Replacement Rebate Program for the front yard.",
          }),
        ],
      }),
    );
    expect(draft.who_may_qualify).toMatch(/500 to 3,000 square feet of green grass/);
    expect(draft.who_may_qualify).toMatch(/served by LADWP for water service/);
    expect(draft.who_may_qualify).toMatch(/single-family homes/);
    expect(draft.who_may_qualify).toMatch(/disadvantaged community/);
    expect(draft.important_notes).toMatch(/SoCalWaterSmart Turf Replacement/);
    expect(draft.important_notes.match(/disadvantaged community/g)?.length ?? 0).toBeLessThan(2);
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("does not turn LOW-confidence, unverified, or unofficial evidence into eligibility", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: { benefit_type: "FREE_SERVICE", benefit_min: null, benefit_max: null },
        evidence_rows: [
          officialEvidenceRow({ confidence: "LOW" }),
          officialEvidenceRow({
            claim: "Every household in the city automatically qualifies.",
            verified_at: null,
          }),
          officialEvidenceRow({
            claim: "Veterans receive priority processing.",
            source_url: "https://example.invalid/blog",
          }),
        ],
      }),
    );
    expect(draft.who_may_qualify).not.toMatch(/500 to 3,000/);
    expect(draft.who_may_qualify).not.toMatch(/automatically qualifies/);
    expect(draft.who_may_qualify).not.toMatch(/Veterans/);
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("omits verified program FAQs that would claim the reader definitely qualifies", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: {
          benefit_type: "FREE_SERVICE",
          benefit_min: null,
          benefit_max: null,
        },
        faqs: [
          {
            question: "What happens after I apply?",
            answer: "If you are eligible, you are notified by email.",
          },
          {
            question: "Who qualifies for this program?",
            answer: "You may qualify if you meet the requirements on this page.",
          },
        ],
      }),
    );
    expect(draft.faqs.some((faq) => faq.question === "What happens after I apply?")).toBe(false);
    expect(draft.faqs.some((faq) => faq.question === "Who qualifies for this program?")).toBe(true);
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("uses verified program FAQs instead of dumping documents into the documents FAQ", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: {
          benefit_type: "FREE_SERVICE",
          benefit_min: null,
          benefit_max: null,
        },
        content: {
          documents_needed:
            "Online account\nOwner-permission letter\nFive photos of the existing front-yard landscape",
          how_to_apply: "Log in and submit the official form in one session.",
        },
        faqs: [
          {
            question: "Who qualifies for this program?",
            answer: "You may qualify if you meet the requirements on this page.",
          },
          {
            question: "What photos or documents do I need?",
            answer: "Prepare the official checklist before you start.",
          },
        ],
      }),
    );
    expect(draft.documents).toMatch(/Five photos of the existing front-yard landscape/);
    expect(
      draft.faqs.find((faq) => faq.question === "What photos or documents do I need?")?.answer,
    ).toBe("Prepare the official checklist before you start.");
    expect(
      draft.faqs.some((faq) =>
        faq.answer.includes("Five photos of the existing front-yard landscape"),
      ),
    ).toBe(false);
    expect(draft.faqs.some((faq) => faq.question === "Who may qualify?")).toBe(false);
    expect(validate(draft, evidence).passed).toBe(true);
  });
});

describe("malicious benefit-type and provenance mutations", () => {
  it("cannot convert FREE_SERVICE into a dollar award by selecting or inventing amount claims", async () => {
    const { draft, evidence, opportunity } = await pair(
      makeRecord({
        program: {
          benefit_type: "FREE_SERVICE",
          benefit_min: null,
          benefit_max: null,
          consumer_headline: "Free front-yard landscaping",
        },
      }),
    );
    expect(draft.source_claims.some((item) => item.claim_id === "faq-q-amount")).toBe(false);
    expect(draft.source_claims.some((item) => item.claim_id === "benefit-unknown-guidance")).toBe(
      false,
    );

    const allowed = buildFactualClaims(evidence);
    const selection = claimIdsBySection(allowed);
    expect(() =>
      composeDraftFromSelectedClaimIds(
        { ...selection, faqs: [...selection.faqs, "faq-q-amount"] },
        allowed,
        evidence,
        opportunity,
      ),
    ).toThrow(LlmDraftProviderError);

    const mutated: ContentDraft = {
      ...draft,
      what_you_get: `${draft.what_you_get}\nAward amounts depend on program conditions.`,
      faqs: [
        ...draft.faqs,
        { question: "How much could I receive?", answer: "Confirm the current award." },
      ],
    };
    const result = validate(mutated, evidence);
    expect(result.passed).toBe(false);
    expect(
      result.errors.some(
        (error) =>
          error.code === "NON_MONETARY_FRAMED_AS_AWARD" || error.code === "UNMAPPED_CLAIM",
      ),
    ).toBe(true);
  });

  it("cannot convert loan or financing into free savings", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: {
          benefit_type: "LOAN",
          benefit_summary: "A repayable loan",
          benefit_min: null,
          benefit_max: null,
        },
      }),
    );
    const mutated: ContentDraft = {
      ...draft,
      what_you_get: `${draft.what_you_get} This will save you free money.`,
    };
    const result = validate(mutated, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "LOAN_FRAMED_AS_SAVINGS")).toBe(true);
  });

  it("cannot turn editorial prose without authoritative provenance into an eligibility requirement", async () => {
    const { draft, evidence, opportunity } = await pair(
      makeRecord({
        program: { benefit_type: "FREE_SERVICE", benefit_min: null, benefit_max: null },
        content: {
          overview:
            "Veterans and homeowners automatically receive this landscaping service if they live anywhere in the city.",
        },
        evidence_rows: [
          officialEvidenceRow({
            confidence: "MEDIUM",
            claim: "Veterans and homeowners automatically receive this landscaping service.",
          }),
        ],
      }),
    );
    expect(draft.who_may_qualify).not.toMatch(/Veterans/);
    expect(draft.who_may_qualify).not.toMatch(/automatically receive/);

    const allowed = buildFactualClaims(evidence);
    const selection = claimIdsBySection(allowed);
    expect(() =>
      composeDraftFromSelectedClaimIds(
        {
          ...selection,
          who_may_qualify: [...selection.who_may_qualify, "eligibility-verified-0"],
        },
        allowed,
        evidence,
        opportunity,
      ),
    ).toThrow(/unknown claim/i);

    const mutated: ContentDraft = {
      ...draft,
      who_may_qualify: `${draft.who_may_qualify}\n- Veterans automatically receive this landscaping service.`,
      source_claims: [
        ...draft.source_claims,
        {
          claim_id: "eligibility-verified-0",
          text: "- Veterans automatically receive this landscaping service.",
          evidence_path: "existing_content.overview",
          source_url: evidence.official_sources[0]?.url ?? null,
          section: "who_may_qualify",
        },
      ],
    };
    const result = validate(mutated, evidence);
    expect(result.passed).toBe(false);
    expect(
      result.errors.some(
        (error) =>
          error.code === "UNSUPPORTED_SOURCE_CLAIM" ||
          error.code === "UNSUPPORTED_ELIGIBILITY" ||
          error.code === "UNMAPPED_CLAIM",
      ),
    ).toBe(true);
  });

  it("cannot strengthen generic sequencing into a specific action", async () => {
    const { draft, evidence, opportunity } = await pair(
      makeRecord({
        program: {
          benefit_type: "FREE_SERVICE",
          category: "water",
          subcategory: "landscaping",
          purchase_before_approval_allowed: false,
          benefit_min: null,
          benefit_max: null,
        },
      }),
    );
    expect(draft.how_to_apply).toContain(GENERIC_SEQUENCING_COPY);
    expect(draft.how_to_apply).not.toMatch(/retiring or delivering your vehicle/i);
    const allowed = buildFactualClaims(evidence);
    const selection = claimIdsBySection(allowed);
    expect(() =>
      composeDraftFromSelectedClaimIds(
        {
          ...selection,
          how_to_apply: [...selection.how_to_apply, "how-to-apply-before-purchase"],
        },
        allowed,
        evidence,
        opportunity,
      ),
    ).toThrow(/unknown claim/i);

    const strengthened: ContentDraft = {
      ...draft,
      source_claims: draft.source_claims.map((item) =>
        item.claim_id === "how-to-apply-before-action"
          ? { ...item, text: VEHICLE_RETIREMENT_SEQUENCING_COPY }
          : item,
      ),
      how_to_apply: draft.how_to_apply.replace(
        GENERIC_SEQUENCING_COPY,
        VEHICLE_RETIREMENT_SEQUENCING_COPY,
      ),
    };
    const result = validate(strengthened, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "UNSUPPORTED_SOURCE_CLAIM")).toBe(true);
  });
});
