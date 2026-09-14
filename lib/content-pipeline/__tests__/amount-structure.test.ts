import { describe, expect, it } from "vitest";
import {
  resolveBenefitAmountStructure,
  looksLikeSynthesizedRange,
} from "@/lib/content-pipeline/amount-structure";
import { buildEvidencePackage } from "@/lib/content-pipeline/build-evidence-package";
import { FakeContentDraftProvider } from "@/lib/content-pipeline/generate-draft";
import { discoverOpportunities } from "@/lib/content-pipeline/discover-opportunities";
import { scoreOpportunity } from "@/lib/content-pipeline/score-opportunity";
import { validateDraft } from "@/lib/content-pipeline/validate-draft";
import type { ContentDraft, EvidencePackage } from "@/lib/content-pipeline/types";
import { makeRecord, NOW } from "./fixtures";

const knownRoutes = ["/", "/check", "/results", "/programs", "/guides", "/programs/test-home-rebate"];

const TIERED_PROGRAM = {
  name: "BAR-like Retirement Award",
  slug: "test-home-rebate",
  benefit_summary: "$1,350 to $2,000 to retire an eligible vehicle",
  benefit_min: 1350,
  benefit_max: 2000,
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

describe("resolveBenefitAmountStructure", () => {
  it("does not infer RANGE from unequal min/max", () => {
    expect(
      resolveBenefitAmountStructure({ min: 1350, max: 2000 }),
    ).toBe("UNKNOWN");
  });

  it("treats equal min/max as SINGLE", () => {
    expect(resolveBenefitAmountStructure({ min: 120, max: 120 })).toBe("SINGLE");
  });

  it("uses modeled tiers as TIERED and refuses TIERED without tiers", () => {
    expect(
      resolveBenefitAmountStructure({
        amount_structure: "TIERED",
        min: 1350,
        max: 2000,
        tiers: TIERED_PROGRAM.benefit_tiers,
      }),
    ).toBe("TIERED");
    expect(
      resolveBenefitAmountStructure({
        amount_structure: "TIERED",
        min: 1350,
        max: 2000,
        tiers: [],
      }),
    ).toBe("UNKNOWN");
  });

  it("honors an explicit RANGE only when min and max differ", () => {
    expect(
      resolveBenefitAmountStructure({
        amount_structure: "RANGE",
        min: 200,
        max: 500,
      }),
    ).toBe("RANGE");
    expect(
      resolveBenefitAmountStructure({
        amount_structure: "RANGE",
        min: 200,
        max: 200,
      }),
    ).toBe("SINGLE");
  });
});

describe("benefit amount presentation", () => {
  it("lets a SINGLE amount render normally", async () => {
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
    expect(evidence.benefit.amount_structure).toBe("SINGLE");
    expect(draft.what_you_get).toMatch(/\$35,000/);
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("lets a true RANGE render as min–max", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: {
          benefit_min: 200,
          benefit_max: 500,
          benefit_amount_structure: "RANGE",
        },
      }),
    );
    expect(evidence.benefit.amount_structure).toBe("RANGE");
    expect(draft.what_you_get).toMatch(/\$200 to \$500/);
    expect(looksLikeSynthesizedRange(draft.what_you_get)).toBe(true);
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("fails a TIERED benefit rendered as a plain synthesized range", async () => {
    const { draft, evidence } = await pair(makeRecord({ program: TIERED_PROGRAM }));
    expect(evidence.benefit.amount_structure).toBe("TIERED");
    draft.what_you_get += " Households get $1,350 to $2,000.";
    const result = validate(draft, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "TIERED_BENEFIT_FLATTENED")).toBe(
      true,
    );
  });

  it("passes a TIERED benefit rendered with individually backed tiers", async () => {
    const { draft, evidence } = await pair(makeRecord({ program: TIERED_PROGRAM }));
    expect(draft.what_you_get).toMatch(/Standard award: \$1,350/);
    expect(draft.what_you_get).toMatch(/Higher award: \$2,000/);
    expect(draft.what_you_get).toMatch(/Condition: Higher award when the income test/);
    expect(draft.what_you_get).not.toMatch(/\$1,350 to \$2,000/);
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("fails an UNKNOWN amount structure rendered as a definite range", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: {
          benefit_min: 1350,
          benefit_max: 2000,
          benefit_summary: "$1,350 to $2,000 to retire an eligible vehicle",
        },
      }),
    );
    expect(evidence.benefit.amount_structure).toBe("UNKNOWN");
    expect(draft.what_you_get).not.toMatch(/\$1,350 to \$2,000/);
    draft.what_you_get += " Get $1,350 to $2,000.";
    const result = validate(draft, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "UNKNOWN_AMOUNT_RANGE")).toBe(true);
  });

  it("fails an unsupported tier amount", async () => {
    const { draft, evidence } = await pair(makeRecord({ program: TIERED_PROGRAM }));
    draft.what_you_get += " There is also a $5,000 path.";
    const result = validate(draft, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "UNSUPPORTED_TIER_AMOUNT")).toBe(
      true,
    );
  });

  it("fails an unsupported tier condition", async () => {
    const { draft, evidence } = await pair(makeRecord({ program: TIERED_PROGRAM }));
    draft.what_you_get += " The higher award is only for homeowners.";
    const result = validate(draft, evidence);
    expect(result.passed).toBe(false);
    expect(
      result.errors.some((error) => error.code === "UNSUPPORTED_TIER_CONDITION"),
    ).toBe(true);
  });

  it("still blocks loan or financing amounts framed as free savings", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: {
          benefit_type: "LOAN",
          benefit_summary: "A repayable loan",
          benefit_min: 50000,
          benefit_max: 250000,
        },
      }),
    );
    expect(evidence.benefit.repayable).toBe(true);
    draft.what_you_get += " This will save you free money.";
    const result = validate(draft, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "LOAN_FRAMED_AS_SAVINGS")).toBe(
      true,
    );
  });

  it("keeps a BAR-like min/max program from collapsing to a simple range", async () => {
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
    expect(draft.overview).not.toMatch(/\$1,350 to \$2,000/);
    expect(draft.what_you_get).not.toMatch(/structured catalog range/i);
    expect(validate(draft, evidence).passed).toBe(true);
    draft.overview += " The structured catalog range is $1,350 to $2,000.";
    const result = validate(draft, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "UNKNOWN_AMOUNT_RANGE")).toBe(true);
  });
});
