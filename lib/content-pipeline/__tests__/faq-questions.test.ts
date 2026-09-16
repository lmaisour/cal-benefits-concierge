import { describe, expect, it } from "vitest";
import { buildEvidencePackage } from "@/lib/content-pipeline/build-evidence-package";
import { FakeContentDraftProvider } from "@/lib/content-pipeline/generate-draft";
import { discoverOpportunities } from "@/lib/content-pipeline/discover-opportunities";
import { scoreOpportunity } from "@/lib/content-pipeline/score-opportunity";
import { validateDraft } from "@/lib/content-pipeline/validate-draft";
import type { ContentDraft, EvidencePackage } from "@/lib/content-pipeline/types";
import { makeRecord, NOW } from "./fixtures";

const knownRoutes = ["/", "/check", "/results", "/programs", "/guides", "/programs/test-home-rebate"];

async function pair(record = makeRecord()) {
  const discovered = discoverOpportunities({ records: [record], now: NOW }).candidates[0];
  if (!discovered) {
    throw new Error("expected candidate");
  }
  const opportunity = scoreOpportunity(discovered, { now: NOW });
  const evidence = buildEvidencePackage(record, NOW);
  const draft = await new FakeContentDraftProvider().generateDraft({ evidence, opportunity });
  return { draft, evidence };
}

function validate(draft: ContentDraft, evidence: EvidencePackage) {
  return validateDraft({
    draft,
    evidence,
    known_routes: knownRoutes,
    own_slug: "test-home-rebate",
    own_titles: [evidence.official_name],
  });
}

describe("FAQ question safety", () => {
  it("accepts generic deterministic FAQ questions", async () => {
    const { draft, evidence } = await pair();
    const questions = draft.faqs.map((faq) => faq.question);
    expect(questions).toContain("How do I apply?");
    expect(questions).toContain("What documents might I need?");
    expect(questions.some((question) => question.startsWith("Who may qualify"))).toBe(true);
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("fails an unsupported dollar assertion in an FAQ question", async () => {
    const { draft, evidence } = await pair();
    draft.faqs[0] = {
      ...draft.faqs[0],
      question: "Can I get $5,000?",
    };
    const result = validate(draft, evidence);
    expect(result.passed).toBe(false);
    expect(
      result.errors.some(
        (error) =>
          error.code === "UNSUPPORTED_AMOUNT" || error.code === "UNMAPPED_CLAIM",
      ),
    ).toBe(true);
  });

  it("fails an unsupported eligibility assertion in an FAQ question", async () => {
    const { draft, evidence } = await pair();
    draft.faqs[0] = {
      ...draft.faqs[0],
      question: "Is this only for homeowners?",
    };
    const result = validate(draft, evidence);
    expect(result.passed).toBe(false);
    expect(
      result.errors.some(
        (error) =>
          error.code === "UNSUPPORTED_ELIGIBILITY" || error.code === "UNMAPPED_CLAIM",
      ),
    ).toBe(true);
  });

  it("fails an unsupported deadline assertion in an FAQ question", async () => {
    const { draft, evidence } = await pair();
    evidence.deadline.application_deadline = null;
    evidence.deadline.effective_end = null;
    draft.faqs[0] = {
      ...draft.faqs[0],
      question: "Does this end October 31, 1999?",
    };
    const result = validate(draft, evidence);
    expect(result.passed).toBe(false);
    expect(
      result.errors.some(
        (error) =>
          error.code === "UNSUPPORTED_DEADLINE" || error.code === "UNMAPPED_CLAIM",
      ),
    ).toBe(true);
  });

  it("accepts an evidence-backed factual FAQ question", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: {
          benefit_min: 1350,
          benefit_max: 2000,
          benefit_amount_structure: "TIERED",
          benefit_tiers: [
            {
              amount: 1350,
              label: "Standard award",
              condition_summary: "Standard path when the higher-award income test is not met.",
              evidence_path: "benefit.tiers.0",
            },
            {
              amount: 2000,
              label: "Higher award",
              condition_summary: "Higher award when the income test for that path is met.",
              evidence_path: "benefit.tiers.1",
            },
          ],
        },
      }),
    );
    const backed = draft.faqs.find((faq) => faq.question.includes("Standard award"));
    expect(backed).toBeTruthy();
    expect(backed?.question).toBe("What award applies for Standard award?");
    expect(validate(draft, evidence).passed).toBe(true);
  });
});
