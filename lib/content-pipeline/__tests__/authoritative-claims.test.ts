import { describe, expect, it } from "vitest";
import { buildEvidencePackage } from "@/lib/content-pipeline/build-evidence-package";
import { discoverOpportunities } from "@/lib/content-pipeline/discover-opportunities";
import {
  FakeContentDraftProvider,
  buildFactualClaims,
  selectDefaultClaims,
} from "@/lib/content-pipeline/generate-draft";
import { scoreOpportunity } from "@/lib/content-pipeline/score-opportunity";
import { validateDraft } from "@/lib/content-pipeline/validate-draft";
import type { ContentDraft, EvidencePackage, SourceClaim } from "@/lib/content-pipeline/types";
import { makeRecord, NOW } from "./fixtures";

const knownRoutes = ["/", "/check", "/results", "/programs", "/guides", "/programs/test-home-rebate"];

const TIERED_PROGRAM = {
  benefit_min: 1350,
  benefit_max: 2000,
  benefit_summary: "$1,350 to $2,000 to retire an eligible vehicle",
  benefit_amount_structure: "TIERED" as const,
  benefit_tiers: [
    {
      amount: 1350,
      label: "Standard award",
      condition_summary: "Standard path when income is not in the higher-award band.",
      evidence_path: "benefit.tiers.0",
    },
    {
      amount: 2000,
      label: "Higher award",
      condition_summary: "Higher award when the income test for that path is met.",
      evidence_path: "benefit.tiers.1",
    },
  ],
};

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
    own_titles: [evidence.official_name],
  });
}

function claim(
  overrides: Pick<SourceClaim, "claim_id" | "text" | "evidence_path" | "section"> &
    Partial<SourceClaim>,
): SourceClaim {
  return {
    source_url: "https://example.invalid/official",
    ...overrides,
  };
}

describe("authoritative source claims", () => {
  it("fails when a provider invents an FAQ question mapped to a real unrelated path", async () => {
    const { draft, evidence } = await pair();
    const invented = "Can every renter apply today?";
    draft.source_claims = [
      ...draft.source_claims,
      claim({
        claim_id: "faq-q-made-up",
        text: invented,
        evidence_path: "official_name",
        section: "faqs",
      }),
    ];
    draft.faqs = [...draft.faqs, { question: invented, answer: "" }];
    const result = validate(draft, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "UNSUPPORTED_SOURCE_CLAIM")).toBe(
      true,
    );
  });

  it("fails when a provider invents an FAQ eligibility assertion mapped to official_name", async () => {
    const { draft, evidence } = await pair();
    const invented = "Is this only for homeowners?";
    draft.source_claims = [
      ...draft.source_claims,
      claim({
        claim_id: "faq-q-homeowner",
        text: invented,
        evidence_path: "official_name",
        section: "faqs",
      }),
    ];
    draft.faqs = [...draft.faqs, { question: invented, answer: "" }];
    const result = validate(draft, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "UNSUPPORTED_SOURCE_CLAIM")).toBe(
      true,
    );
  });

  it("fails when a provider invents a tier condition mapped to a real tier path", async () => {
    const { draft, evidence } = await pair(makeRecord({ program: TIERED_PROGRAM }));
    const invented =
      "Higher award: $2,000. Condition: only if the applicant is a homeowner.";
    draft.source_claims = [
      ...draft.source_claims,
      claim({
        claim_id: "benefit-invented-tier",
        text: invented,
        evidence_path: "benefit.tiers.0.condition_summary",
        section: "what_you_get",
      }),
    ];
    draft.what_you_get += ` ${invented}`;
    const result = validate(draft, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "UNSUPPORTED_SOURCE_CLAIM")).toBe(
      true,
    );
  });

  it("fails when a provider invents a body sentence mapped to an existing evidence path", async () => {
    const { draft, evidence } = await pair();
    const invented = "Homeowners automatically receive this rebate.";
    draft.source_claims = [
      ...draft.source_claims,
      claim({
        claim_id: "overview-invented",
        text: invented,
        evidence_path: "official_name",
        section: "overview",
      }),
    ];
    draft.overview += ` ${invented}`;
    const result = validate(draft, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "UNSUPPORTED_SOURCE_CLAIM")).toBe(
      true,
    );
  });

  it("fails when a provider changes a supported dollar claim’s text but keeps the path", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: {
          benefit_min: 35000,
          benefit_max: 35000,
          benefit_summary: "A $35,000 grant",
          benefit_amount_structure: "SINGLE",
        },
      }),
    );
    const original = draft.source_claims.find((item) => item.claim_id === "benefit-amount");
    expect(original).toBeTruthy();
    expect(original?.evidence_path).toBe("benefit.min");
    draft.source_claims = draft.source_claims.map((item) =>
      item.claim_id === "benefit-amount"
        ? { ...item, text: "The structured catalog value is $99,000." }
        : item,
    );
    draft.what_you_get = draft.what_you_get.replace(
      original?.text ?? "",
      "The structured catalog value is $99,000.",
    );
    const result = validate(draft, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "UNSUPPORTED_SOURCE_CLAIM")).toBe(
      true,
    );
  });

  it("fails when a provider changes a deadline claim but keeps the deadline path", async () => {
    const { draft, evidence } = await pair();
    const original = draft.source_claims.find(
      (item) => item.claim_id === "notes-deadline-date",
    );
    expect(original).toBeTruthy();
    expect(original?.evidence_path).toBe("deadline.application_deadline");
    draft.source_claims = draft.source_claims.map((item) =>
      item.claim_id === "notes-deadline-date"
        ? { ...item, text: "The structured application deadline is January 1, 1999." }
        : item,
    );
    draft.important_notes = draft.important_notes.replace(
      original?.text ?? "",
      "The structured application deadline is January 1, 1999.",
    );
    const result = validate(draft, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "UNSUPPORTED_SOURCE_CLAIM")).toBe(
      true,
    );
  });

  it("fails when a valid claim’s source URL is changed to another valid HTTP URL", async () => {
    const { draft, evidence } = await pair();
    const original = draft.source_claims.find((item) => item.source_url);
    expect(original?.source_url).toBeTruthy();
    draft.source_claims = draft.source_claims.map((item) =>
      item.claim_id === original?.claim_id
        ? { ...item, source_url: "https://example.invalid/other-official" }
        : item,
    );
    const result = validate(draft, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "UNSUPPORTED_SOURCE_CLAIM")).toBe(
      true,
    );
  });

  it("fails when a valid claim’s source URL is removed but the authoritative claim has one", async () => {
    const { draft, evidence } = await pair();
    const original = draft.source_claims.find((item) => item.source_url);
    expect(original?.source_url).toBeTruthy();
    draft.source_claims = draft.source_claims.map((item) =>
      item.claim_id === original?.claim_id ? { ...item, source_url: null } : item,
    );
    const result = validate(draft, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "UNSUPPORTED_SOURCE_CLAIM")).toBe(
      true,
    );
  });

  it("still passes the normal fake-provider draft", async () => {
    const { draft, evidence } = await pair();
    const allowed = buildFactualClaims(evidence);
    expect(draft.source_claims.length).toBe(selectDefaultClaims(allowed).length);
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("still passes a TIERED structured draft", async () => {
    const { draft, evidence } = await pair(makeRecord({ program: TIERED_PROGRAM }));
    expect(evidence.benefit.amount_structure).toBe("TIERED");
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("still passes an UNKNOWN BAR-like draft without a synthesized range", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: {
          name: "BAR Consumer Assistance Program Vehicle Retirement",
          benefit_summary: "$1,350 to $2,000 to retire an eligible vehicle",
          benefit_min: 1350,
          benefit_max: 2000,
        },
      }),
    );
    expect(evidence.benefit.amount_structure).toBe("UNKNOWN");
    expect(`${draft.overview}\n${draft.what_you_get}`).not.toMatch(/\$1,350 to \$2,000/);
    expect(validate(draft, evidence).passed).toBe(true);
  });
});
