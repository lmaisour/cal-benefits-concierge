import { describe, expect, it } from "vitest";
import { leapFaqs } from "@/data/content/ladwp-landscape-efficiency-assistance";
import { buildCatalogContext } from "@/lib/content-pipeline/catalog";
import { buildEvidencePackage } from "@/lib/content-pipeline/build-evidence-package";
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
import { eligibilityCorpus, validateDraft } from "@/lib/content-pipeline/validate-draft";
import {
  authoritativeProgramFaqs,
  isAuthoritativeProgramFaq,
  programFaqIsSafeForDraft,
} from "@/lib/content-pipeline/verified-facts";
import type {
  ContentDraft,
  DiscoveryRecord,
  EvidencePackage,
  ScoredOpportunity,
} from "@/lib/content-pipeline/types";
import { makeRecord, NOW } from "./fixtures";

const knownRoutes = [
  "/",
  "/check",
  "/results",
  "/programs",
  "/guides",
  "/programs/test-home-rebate",
  "/programs/ladwp-landscape-efficiency-assistance",
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
    own_slug: evidence.external_id === "LADWP-WATER-LEAP"
      ? "ladwp-landscape-efficiency-assistance"
      : "test-home-rebate",
    own_titles: [evidence.official_name, evidence.consumer_headline ?? ""],
  });
}

function scoredOpportunity(record: DiscoveryRecord): ScoredOpportunity {
  return {
    opportunity_type: "PROGRAM_GUIDE",
    program_id: record.program_id,
    external_id: record.program.external_id,
    proposed_slug: record.program.slug,
    proposed_title: record.program.name,
    primary_keyword: record.program.name,
    secondary_keywords: [],
    discovery_reason: "FAQ authority fixture.",
    record,
    score: 100,
    score_breakdown: { version: 1, total: 100, components: [], notes: [] },
  };
}

const UNGROUNDED_PLAUSIBLE_FAQ = {
  question: "What happens after I apply?",
  answer:
    "Staff review applications in the order they arrive and send a status email when the file is complete.",
};

const FABRICATED_VETERAN_FAQ = {
  question: "Do veterans get priority processing?",
  answer: "Veterans receive priority processing and an extra eligibility pathway.",
};

describe("program FAQ authority boundary", () => {
  it("does not turn an arbitrary stored FAQ into an allowed factual claim just because Q+A are populated", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: {
          benefit_type: "FREE_SERVICE",
          benefit_min: null,
          benefit_max: null,
        },
        faqs: [UNGROUNDED_PLAUSIBLE_FAQ],
      }),
    );

    expect(UNGROUNDED_PLAUSIBLE_FAQ.question.trim().length).toBeGreaterThan(0);
    expect(UNGROUNDED_PLAUSIBLE_FAQ.answer.trim().length).toBeGreaterThan(0);
    expect(programFaqIsSafeForDraft(UNGROUNDED_PLAUSIBLE_FAQ)).toBe(true);
    expect(isAuthoritativeProgramFaq(UNGROUNDED_PLAUSIBLE_FAQ, evidence)).toBe(false);
    expect(authoritativeProgramFaqs(evidence)).toEqual([]);
    expect(draft.source_claims.some((item) => item.claim_id.startsWith("faq-q-program-"))).toBe(
      false,
    );
    expect(draft.faqs.some((faq) => faq.question === UNGROUNDED_PLAUSIBLE_FAQ.question)).toBe(
      false,
    );
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("does not let a fabricated eligibility FAQ expand the validator corpus", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: {
          benefit_type: "FREE_SERVICE",
          benefit_min: null,
          benefit_max: null,
        },
        faqs: [FABRICATED_VETERAN_FAQ],
      }),
    );

    expect(isAuthoritativeProgramFaq(FABRICATED_VETERAN_FAQ, evidence)).toBe(false);
    expect(eligibilityCorpus(evidence)).not.toMatch(/veteran/i);
    expect(draft.faqs.some((faq) => /veteran/i.test(`${faq.question} ${faq.answer}`))).toBe(
      false,
    );

    const mutated: ContentDraft = {
      ...draft,
      who_may_qualify: `${draft.who_may_qualify}\n- Veterans receive priority processing.`,
    };
    const result = validate(mutated, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "UNSUPPORTED_ELIGIBILITY")).toBe(true);
  });

  it("still allows a stored FAQ when HIGH verified official evidence independently grounds it", async () => {
    const groundedFaq = {
      question: "How much grass do I need?",
      answer: "The front yard must have 500 to 3,000 square feet of green grass.",
    };
    const { draft, evidence } = await pair(
      makeRecord({
        program: {
          benefit_type: "FREE_SERVICE",
          benefit_summary: "Free front-yard landscaping",
          benefit_min: null,
          benefit_max: null,
        },
        evidence_rows: [
          {
            content_section: "eligibility",
            claim: "The front yard must have 500 to 3,000 square feet of green grass.",
            source_url: "https://example.invalid/official",
            verified_at: "2026-09-12T00:00:00.000Z",
            confidence: "HIGH",
          },
        ],
        faqs: [groundedFaq],
      }),
    );

    expect(isAuthoritativeProgramFaq(groundedFaq, evidence)).toBe(true);
    expect(draft.source_claims.some((item) => item.claim_id === "faq-q-program-0")).toBe(true);
    expect(draft.faqs.some((faq) => faq.question === groundedFaq.question)).toBe(true);
    expect(draft.faqs.some((faq) => faq.answer === groundedFaq.answer)).toBe(true);
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("falls back to generic FAQs when stored FAQs fail the authority gate", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: {
          benefit_type: "REBATE",
          benefit_min: 200,
          benefit_max: 500,
        },
        faqs: [UNGROUNDED_PLAUSIBLE_FAQ, FABRICATED_VETERAN_FAQ],
      }),
    );

    expect(authoritativeProgramFaqs(evidence)).toEqual([]);
    const questions = draft.faqs.map((faq) => faq.question);
    expect(questions).toContain("Who may qualify?");
    expect(questions).toContain("How do I apply?");
    expect(questions).toContain("What documents might I need?");
    expect(questions).toContain("How much could I receive?");
    expect(questions).not.toContain(UNGROUNDED_PLAUSIBLE_FAQ.question);
    expect(questions).not.toContain(FABRICATED_VETERAN_FAQ.question);
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("rejects malicious provider selection of a stored FAQ that failed the authority gate", async () => {
    const groundedFaq = {
      question: "What photos or documents do I need?",
      answer:
        "Prepare an owner-permission letter and five photos of the existing front-yard landscape.",
    };
    const { evidence, opportunity } = await pair(
      makeRecord({
        program: {
          benefit_type: "FREE_SERVICE",
          benefit_min: null,
          benefit_max: null,
        },
        content: {
          documents_needed:
            "Owner-permission letter\nFive photos of the existing front-yard landscape",
        },
        faqs: [UNGROUNDED_PLAUSIBLE_FAQ, groundedFaq],
      }),
    );

    const allowed = buildFactualClaims(evidence);
    expect(allowed.some((claim) => claim.claim_id === "faq-q-program-0")).toBe(false);
    expect(allowed.some((claim) => claim.claim_id === "faq-a-program-0")).toBe(false);
    expect(allowed.some((claim) => claim.claim_id === "faq-q-program-1")).toBe(true);

    const selection = claimIdsBySection(allowed);
    expect(() =>
      composeDraftFromSelectedClaimIds(
        { ...selection, faqs: [...selection.faqs, "faq-q-program-0"] },
        allowed,
        evidence,
        opportunity,
      ),
    ).toThrow(LlmDraftProviderError);
    try {
      composeDraftFromSelectedClaimIds(
        { ...selection, faqs: [...selection.faqs, "faq-q-program-0"] },
        allowed,
        evidence,
        opportunity,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(LlmDraftProviderError);
      expect((error as LlmDraftProviderError).code).toBe("UNKNOWN_CLAIM_ID");
    }
  });
});

describe("LEAP stored FAQ authority", () => {
  it("retains program-specific FAQs only where independent provenance supports them", async () => {
    const record = buildCatalogContext().records.find(
      (item) => item.program.external_id === "LADWP-WATER-LEAP",
    );
    if (!record) {
      throw new Error("LEAP catalog record is missing.");
    }

    const evidence = buildEvidencePackage(record, NOW);
    const opportunity = scoredOpportunity(record);
    const draft = await new FakeContentDraftProvider().generateDraft({
      evidence,
      opportunity,
    });

    expect(record.faqs).toHaveLength(13);
    expect(leapFaqs).toHaveLength(13);
    expect(eligibilityCorpus(evidence)).not.toMatch(/1-800-544-4498/);
    expect(eligibilityCorpus(evidence)).not.toMatch(/LEAP@ladwp\.com/i);

    const retained = authoritativeProgramFaqs(evidence).map((faq) => faq.question);
    const rejected = leapFaqs
      .filter((faq) => !isAuthoritativeProgramFaq(faq, evidence))
      .map((faq) => faq.question);

    // Retained: independently grounded in catalog/content paths or structured
    // deadline. Rejected: renter/income/grass/DAC-tool facts are not in those
    // paths (program_faqs and overlay evidence rows lack verified provenance),
    // or the answer claims the reader "is eligible".
    expect(retained).toEqual([
      "Is LADWP LEAP really free?",
      "Does my property need LADWP water service?",
      "Can I choose my own plants and design?",
      "Can I apply if I already used a turf replacement rebate?",
      "Can I save the LEAP application and finish later?",
      "What photos or documents do I need?",
      "When is the LEAP application deadline?",
    ]);
    expect(rejected).toEqual([
      "Who qualifies for LEAP?",
      "Do I need to own the home?",
      "Can renters apply?",
      "How much grass do I need?",
      "How do I know if my property is in a disadvantaged community?",
      "What happens after I apply?",
    ]);

    for (const question of retained) {
      expect(draft.faqs.some((faq) => faq.question === question)).toBe(true);
    }
    for (const question of rejected) {
      expect(draft.faqs.some((faq) => faq.question === question)).toBe(false);
    }

    expect(draft.faqs.some((faq) => faq.question === "Who may qualify?")).toBe(true);
    expect(draft.faqs.some((faq) => faq.question === "How do I apply?")).toBe(true);
    expect(draft.faqs.some((faq) => faq.question === "What documents might I need?")).toBe(false);
    expect(validate(draft, evidence).passed).toBe(true);
  });
});
