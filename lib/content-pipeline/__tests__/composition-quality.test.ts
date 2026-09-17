import { describe, expect, it } from "vitest";
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
  selectDefaultClaims,
} from "@/lib/content-pipeline/generate-draft";
import { isSafeConsumerHeadline } from "@/lib/content-pipeline/headline-safety";
import { scoreOpportunity } from "@/lib/content-pipeline/score-opportunity";
import {
  GENERIC_SEQUENCING_COPY,
  resolveSequencingAction,
  sequencingCopy,
  VEHICLE_RETIREMENT_SEQUENCING_COPY,
} from "@/lib/content-pipeline/sequencing";
import { validateDraft } from "@/lib/content-pipeline/validate-draft";
import type { ContentDraft, EvidencePackage, SourceClaim } from "@/lib/content-pipeline/types";
import { makeRecord, NOW } from "./fixtures";

const knownRoutes = [
  "/",
  "/check",
  "/results",
  "/programs",
  "/guides",
  "/programs/test-home-rebate",
  "/programs/bar-vehicle-retirement",
];

const BAR_TIERS = [
  {
    amount: 1350,
    label: "$1,350 retirement award",
    condition_summary:
      "No household-income test. The vehicle must have failed its most recent Smog Check for a reason other than ignition timing, a gas-cap test, or a tampered emissions control system. Aborted, manual-mode, and training-mode tests do not count.",
    evidence_path: "benefit.tiers.0",
  },
  {
    amount: 1500,
    label: "$1,500 retirement award",
    condition_summary:
      "Gross household income at or below 225% of the federal poverty level, with income documentation. The vehicle must have a completed Smog Check (pass or fail) within 180 days before applying, unless it is not subject to Smog Check. Battery-electric and hydrogen fuel-cell vehicles are not eligible.",
    evidence_path: "benefit.tiers.1",
  },
  {
    amount: 2000,
    label: "$2,000 retirement award",
    condition_summary:
      "Gross household income at or below 225% of the federal poverty level, with income documentation. The vehicle must have failed its most recent Smog Check for a reason other than ignition timing, a gas-cap test, or a tampered emissions control system. Aborted, manual-mode, and training-mode tests do not count.",
    evidence_path: "benefit.tiers.2",
  },
];

const BAR_PROGRAM = {
  name: "BAR Consumer Assistance Program Vehicle Retirement",
  slug: "bar-vehicle-retirement",
  consumer_headline: null as string | null,
  administrator: "California Bureau of Automotive Repair",
  administrator_display_name: null as string | null,
  category: "vehicles" as const,
  subcategory: "vehicle-retirement",
  short_description:
    "Cash to retire an eligible vehicle at a BAR-contracted dismantler after you receive a letter of eligibility.",
  benefit_summary:
    "$1,350, $1,500, or $2,000 to retire an eligible vehicle, depending on income and Smog Check status",
  benefit_type: "CASH" as const,
  benefit_min: 1350,
  benefit_max: 2000,
  benefit_amount_structure: "TIERED" as const,
  benefit_tiers: BAR_TIERS,
  purchase_before_approval_allowed: false,
  preapproval_required: true,
  application_deadline: null,
  has_unmodeled_required_criteria: true,
  unmodeled_required_criteria_summary:
    "The vehicle must meet Smog Check and ownership rules. Higher awards also require an income test that is not fully checked here.",
};

function barRecord(
  programOverrides: Partial<typeof BAR_PROGRAM> = {},
  extras: Parameters<typeof makeRecord>[0] = {},
) {
  return makeRecord({
    program: { ...BAR_PROGRAM, ...programOverrides },
    rules: [
      {
        program_external_id: "TEST-REBATE-1",
        field: "owns_vehicle",
        operator: "is_true",
        value: true,
        rule_group: 1,
        group_operator: "AND",
        required: true,
        explanation: "You must be the registered owner.",
      },
      {
        program_external_id: "TEST-REBATE-1",
        field: "willing_to_retire_vehicle",
        operator: "is_true",
        value: true,
        rule_group: 1,
        group_operator: "AND",
        required: true,
        explanation: "The award is paid only if you retire the vehicle after approval.",
      },
    ],
    ...extras,
  });
}

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
    own_slug: evidence.external_id === "TEST-REBATE-1" ? "test-home-rebate" : "bar-vehicle-retirement",
    own_titles: [evidence.official_name, evidence.consumer_headline ?? ""],
  });
}

function claimText(claims: SourceClaim[], id: string): string {
  return claims.find((item) => item.claim_id === id)?.text ?? "";
}

describe("consumer-quality composition", () => {
  it("keeps BAR as three conditional TIERED awards without synthesizing a range", async () => {
    const { draft, evidence } = await pair(barRecord());
    expect(evidence.benefit.amount_structure).toBe("TIERED");
    expect(evidence.benefit.tiers.map((tier) => tier.amount)).toEqual([1350, 1500, 2000]);
    expect(draft.h1).toBe("BAR Consumer Assistance Program Vehicle Retirement");
    expect(draft.seo_title).toBe("BAR Consumer Assistance Program Vehicle Retirement");
    expect(draft.overview).toMatch(/Cash to retire an eligible vehicle/);
    expect(draft.overview).toMatch(/California Bureau of Automotive Repair/);
    expect(draft.overview).toMatch(/Available statewide in California/);
    expect(draft.overview).toMatch(/Award amounts are condition-dependent/);
    expect(draft.overview).not.toMatch(/No household-income test/);
    expect(draft.overview).not.toMatch(/225%/);
    expect(draft.overview).not.toMatch(/Official source:/);
    expect(draft.overview).not.toMatch(/https:\/\//);
    expect(draft.what_you_get).toMatch(/\$1,350/);
    expect(draft.what_you_get).toMatch(/\$1,500/);
    expect(draft.what_you_get).toMatch(/\$2,000/);
    expect(draft.what_you_get).not.toMatch(/\$1,350 to \$2,000/);
    expect(draft.what_you_get).not.toMatch(/\$1,350–\$2,000/);
    const tier0 = claimText(draft.source_claims, "benefit-tier-0");
    const tier1 = claimText(draft.source_claims, "benefit-tier-1");
    const tier2 = claimText(draft.source_claims, "benefit-tier-2");
    expect(tier0).toMatch(/\$1,350/);
    expect(tier0).toMatch(/No household-income test/);
    expect(tier0).not.toMatch(/225%/);
    expect(tier1).toMatch(/\$1,500/);
    expect(tier1).toMatch(/225%/);
    expect(tier1).toMatch(/pass or fail/);
    expect(tier2).toMatch(/\$2,000/);
    expect(tier2).toMatch(/225%/);
    expect(tier2).toMatch(/failed its most recent Smog Check/);
    expect(draft.who_may_qualify).toMatch(/You may qualify if you meet the requirements below/);
    expect(draft.who_may_qualify).not.toMatch(/Households may qualify when they meet the modeled rules/);
    expect(draft.how_to_apply).toMatch(/retiring or delivering your vehicle/);
    expect(draft.how_to_apply).not.toMatch(/\bbuy\b/i);
    expect(draft.how_to_apply).not.toMatch(/https:\/\//);
    expect(draft.suggested_official_cta?.href).toBe("https://example.invalid/apply");
    expect(draft.documents).toMatch(/not fully listed/);
    expect(draft.important_notes).toMatch(/not fully modeled/);
    expect(draft.important_notes).toMatch(/No structured application deadline/);
    expect(draft.faqs.some((faq) => faq.question === "How much could I receive?")).toBe(true);
    expect(draft.faqs.some((faq) => faq.question.startsWith("What award applies for"))).toBe(false);
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("uses a verified consumer headline when it is factually safe", async () => {
    const { draft, evidence } = await pair(
      barRecord({
        consumer_headline: "Get up to $2,000 to retire an eligible vehicle",
      }),
    );
    expect(draft.h1).toBe("Get up to $2,000 to retire an eligible vehicle");
    expect(draft.seo_title).toBe("Get up to $2,000 to retire an eligible vehicle");
    expect(draft.overview).toMatch(/BAR Consumer Assistance Program Vehicle Retirement/);
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("falls back to the official name when the consumer headline is missing or unsafe", async () => {
    const missing = await pair(barRecord({ consumer_headline: null }));
    expect(missing.draft.h1).toBe(missing.evidence.official_name);
    expect(missing.draft.seo_title).toBe(missing.evidence.official_name);

    const invented = await pair(barRecord({ consumer_headline: "Get up to $5,000 today" }));
    expect(invented.draft.h1).toBe(invented.evidence.official_name);
    expect(isSafeConsumerHeadline("Get up to $5,000 today", invented.evidence)).toBe(false);

    const unqualified = await pair(
      barRecord({ consumer_headline: "Get $2,000 to retire an eligible vehicle" }),
    );
    expect(unqualified.draft.h1).toBe(unqualified.evidence.official_name);
    expect(validate(missing.draft, missing.evidence).passed).toBe(true);
    expect(validate(invented.draft, invented.evidence).passed).toBe(true);
    expect(validate(unqualified.draft, unqualified.evidence).passed).toBe(true);
  });

  it("does not give SINGLE benefits tier or synthesized-range language", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: {
          consumer_headline: null,
          benefit_min: 35000,
          benefit_max: 35000,
          benefit_summary: "A $35,000 grant",
          benefit_amount_structure: "SINGLE",
        },
      }),
    );
    expect(evidence.benefit.amount_structure).toBe("SINGLE");
    expect(draft.what_you_get).toMatch(/\$35,000/);
    expect(draft.what_you_get).not.toMatch(/one of the following awards/i);
    expect(draft.what_you_get).not.toMatch(/\$35,000 to /);
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("keeps a genuine RANGE as a range", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: {
          consumer_headline: null,
          benefit_min: 200,
          benefit_max: 500,
          benefit_amount_structure: "RANGE",
        },
      }),
    );
    expect(evidence.benefit.amount_structure).toBe("RANGE");
    expect(draft.what_you_get).toMatch(/\$200 to \$500/);
    expect(draft.what_you_get).not.toMatch(/one of the following awards/i);
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("does not invent an amount for UNKNOWN structures", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: {
          name: "BAR Consumer Assistance Program Vehicle Retirement",
          consumer_headline: null,
          benefit_summary: "$1,350 to $2,000 to retire an eligible vehicle",
          benefit_min: 1350,
          benefit_max: 2000,
        },
      }),
    );
    expect(evidence.benefit.amount_structure).toBe("UNKNOWN");
    expect(draft.what_you_get).not.toMatch(/\$1,350/);
    expect(draft.overview).not.toMatch(/\$1,350 to \$2,000/);
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("preserves unmodeled eligibility caveats and does not invent a deadline", async () => {
    const { draft, evidence } = await pair(barRecord());
    expect(draft.who_may_qualify).toMatch(/not fully modeled/);
    expect(draft.important_notes).toMatch(/not fully modeled/);
    expect(draft.important_notes).toMatch(/No structured application deadline/);
    expect(`${draft.overview}\n${draft.what_you_get}\n${draft.how_to_apply}`).not.toMatch(
      /\b(apply by|deadline|due by)\b/i,
    );
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("preserves an exact structured deadline", async () => {
    const { draft, evidence } = await pair(
      makeRecord({
        program: { application_deadline: "2026-11-01" },
      }),
    );
    expect(draft.important_notes).toMatch(/November 1, 2026/);
    expect(draft.faqs.some((faq) => faq.answer.includes("November 1, 2026"))).toBe(true);
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("surfaces structured documents and keeps unknown documents unknown", async () => {
    const listed = await pair(
      makeRecord({
        content: {
          documents_needed: "Proof of vehicle registration.\nIncome documentation.",
        },
      }),
    );
    expect(listed.draft.documents).toMatch(/Proof of vehicle registration/);
    expect(listed.draft.documents).toMatch(/Income documentation/);
    expect(listed.draft.documents).not.toMatch(/not fully listed/);
    expect(validate(listed.draft, listed.evidence).passed).toBe(true);

    const unknown = await pair(barRecord());
    expect(unknown.draft.documents).toMatch(/not fully listed/);
    expect(validate(unknown.draft, unknown.evidence).passed).toBe(true);
  });

  it("resolves BAR vehicle-retirement sequencing only from strong modeled evidence", async () => {
    expect(
      resolveSequencingAction({ modeledFields: ["willing_to_retire_vehicle"] }),
    ).toBe("vehicle_retirement");
    expect(sequencingCopy("vehicle_retirement")).toBe(VEHICLE_RETIREMENT_SEQUENCING_COPY);

    const { draft, evidence } = await pair(barRecord());
    expect(draft.how_to_apply).toContain(VEHICLE_RETIREMENT_SEQUENCING_COPY);
    expect(draft.how_to_apply).not.toMatch(/\bbuy\b/i);
    expect(validate(draft, evidence).passed).toBe(true);
  });

  it("does not treat taxonomy as an action type and stays generic without modeled evidence", async () => {
    expect(resolveSequencingAction({ modeledFields: [] })).toBe("generic");
    expect(resolveSequencingAction({})).toBe("generic");
    expect(sequencingCopy("generic")).toBe(GENERIC_SEQUENCING_COPY);

    const taxonomyOnly = await pair(
      barRecord(
        { subcategory: "vehicle-retirement" },
        {
          rules: [
            {
              program_external_id: "TEST-REBATE-1",
              field: "owns_vehicle",
              operator: "is_true",
              value: true,
              rule_group: 1,
              group_operator: "AND",
              required: true,
              explanation: "You must be the registered owner.",
            },
          ],
        },
      ),
    );
    expect(taxonomyOnly.draft.how_to_apply).toContain(GENERIC_SEQUENCING_COPY);
    expect(taxonomyOnly.draft.how_to_apply).not.toMatch(/retiring or delivering your vehicle/i);
    expect(taxonomyOnly.draft.how_to_apply).not.toMatch(/\bbuy the item\b/i);

    const installationLooking = await pair(
      makeRecord({
        program: {
          category: "home-energy",
          subcategory: "charger-installation",
          purchase_before_approval_allowed: false,
        },
      }),
    );
    expect(installationLooking.draft.how_to_apply).toContain(GENERIC_SEQUENCING_COPY);
    expect(installationLooking.draft.how_to_apply).not.toMatch(/installation or repair/i);
    expect(installationLooking.draft.how_to_apply).not.toMatch(/\bbuy the item\b/i);
    expect(installationLooking.draft.who_may_qualify).not.toMatch(/installation or repair/i);

    const projectLooking = await pair(
      makeRecord({
        program: {
          category: "home-energy",
          subcategory: "home-upgrade",
          purchase_before_approval_allowed: false,
        },
      }),
    );
    expect(projectLooking.draft.how_to_apply).toContain(GENERIC_SEQUENCING_COPY);
    expect(projectLooking.draft.how_to_apply).not.toMatch(/before the project starts/i);
    expect(projectLooking.draft.how_to_apply).not.toMatch(/\bbuy the item\b/i);

    const unknownCategory = await pair(
      makeRecord({
        program: {
          category: "home-energy",
          subcategory: null,
          purchase_before_approval_allowed: false,
        },
      }),
    );
    expect(unknownCategory.draft.how_to_apply).toContain(GENERIC_SEQUENCING_COPY);
    expect(unknownCategory.draft.how_to_apply).not.toMatch(/\bbuy the item\b/i);
    expect(unknownCategory.draft.source_claims.some((claim) => claim.claim_id === "how-to-apply-before-action")).toBe(
      true,
    );
    expect(validate(installationLooking.draft, installationLooking.evidence).passed).toBe(true);
    expect(validate(projectLooking.draft, projectLooking.evidence).passed).toBe(true);
    expect(validate(unknownCategory.draft, unknownCategory.evidence).passed).toBe(true);
  });

  it("builds equivalent FAQ atoms for every modeled tier", async () => {
    const { evidence, opportunity } = await pair(barRecord());
    const allowed = buildFactualClaims(evidence);
    expect(allowed.some((claim) => claim.claim_id === "faq-q-tier-0")).toBe(true);
    expect(allowed.some((claim) => claim.claim_id === "faq-a-tier-0")).toBe(true);
    expect(allowed.some((claim) => claim.claim_id === "faq-q-tier-1")).toBe(true);
    expect(allowed.some((claim) => claim.claim_id === "faq-a-tier-1")).toBe(true);
    expect(allowed.some((claim) => claim.claim_id === "faq-q-tier-2")).toBe(true);
    expect(allowed.some((claim) => claim.claim_id === "faq-a-tier-2")).toBe(true);
    expect(claimText(allowed, "faq-a-tier-0")).toMatch(/\$1,350/);
    expect(claimText(allowed, "faq-a-tier-1")).toMatch(/\$1,500/);
    expect(claimText(allowed, "faq-a-tier-2")).toMatch(/\$2,000/);
    const selected = composeDraftFromSelectedClaimIds(
      claimIdsBySection(allowed),
      allowed,
      evidence,
      opportunity,
    );
    expect(selected.faqs.some((faq) => faq.question.includes("$1,500 retirement award"))).toBe(
      true,
    );
    expect(validate(selected, evidence).passed).toBe(true);
  });

  it("lets the default fake provider omit per-tier FAQs while still requiring every what-you-get tier", async () => {
    const { draft, evidence, opportunity } = await pair(barRecord());
    const allowed = buildFactualClaims(evidence);
    expect(selectDefaultClaims(allowed).some((claim) => /^faq-[qa]-tier-/.test(claim.claim_id))).toBe(
      false,
    );
    expect(draft.source_claims.some((claim) => claim.claim_id === "benefit-tier-2")).toBe(true);
    const selection = claimIdsBySection(selectDefaultClaims(allowed));
    selection.what_you_get = selection.what_you_get.filter((id) => id !== "benefit-tier-1");
    expect(() =>
      composeDraftFromSelectedClaimIds(selection, allowed, evidence, opportunity),
    ).toThrow(/omitted required claim/i);
  });
});

describe("malicious tier FAQ mutations", () => {
  it("rejects a nonexistent tier FAQ ID", async () => {
    const { evidence, opportunity } = await pair(barRecord());
    const allowed = buildFactualClaims(evidence);
    const selection = claimIdsBySection(allowed);
    selection.faqs = [...selection.faqs, "faq-q-tier-9"];
    expect(() =>
      composeDraftFromSelectedClaimIds(selection, allowed, evidence, opportunity),
    ).toThrow(LlmDraftProviderError);
    try {
      composeDraftFromSelectedClaimIds(selection, allowed, evidence, opportunity);
    } catch (error) {
      expect(error).toMatchObject({ code: "UNKNOWN_CLAIM_ID" });
    }
  });

  it("rejects an altered tier amount, condition, or swapped tier path", async () => {
    const { evidence, opportunity } = await pair(barRecord());
    const allowed = buildFactualClaims(evidence);
    const full = composeDraftFromSelectedClaimIds(
      claimIdsBySection(allowed),
      allowed,
      evidence,
      opportunity,
    );

    const amountMutated: ContentDraft = {
      ...full,
      source_claims: full.source_claims.map((item) =>
        item.claim_id === "faq-a-tier-1"
          ? { ...item, text: item.text.replace("$1,500", "$9,999") }
          : item,
      ),
      faqs: full.faqs.map((faq) => ({
        ...faq,
        answer: faq.answer.replace("$1,500", "$9,999"),
      })),
    };
    const amountResult = validate(amountMutated, evidence);
    expect(amountResult.passed).toBe(false);
    expect(
      amountResult.errors.some(
        (error) =>
          error.code === "UNSUPPORTED_SOURCE_CLAIM" || error.code === "UNSUPPORTED_TIER_AMOUNT",
      ),
    ).toBe(true);

    const conditionMutated: ContentDraft = {
      ...full,
      source_claims: full.source_claims.map((item) =>
        item.claim_id === "faq-a-tier-0"
          ? { ...item, text: "$1,350\nOnly if the applicant is a homeowner." }
          : item,
      ),
      faqs: full.faqs.map((faq) =>
        faq.question.includes("$1,350")
          ? { ...faq, answer: "$1,350\nOnly if the applicant is a homeowner." }
          : faq,
      ),
    };
    const conditionResult = validate(conditionMutated, evidence);
    expect(conditionResult.passed).toBe(false);
    expect(
      conditionResult.errors.some(
        (error) =>
          error.code === "UNSUPPORTED_SOURCE_CLAIM" ||
          error.code === "UNSUPPORTED_TIER_CONDITION" ||
          error.code === "UNSUPPORTED_ELIGIBILITY",
      ),
    ).toBe(true);

    const swapped: ContentDraft = {
      ...full,
      source_claims: full.source_claims.map((item) =>
        item.claim_id === "faq-a-tier-2"
          ? { ...item, evidence_path: "benefit.tiers.0.condition_summary" }
          : item,
      ),
    };
    const swappedResult = validate(swapped, evidence);
    expect(swappedResult.passed).toBe(false);
    expect(swappedResult.errors.some((error) => error.code === "UNSUPPORTED_SOURCE_CLAIM")).toBe(
      true,
    );
  });

  it("rejects a mutated official CTA destination", async () => {
    const { draft, evidence } = await pair(barRecord());
    const mutated = {
      ...draft,
      suggested_official_cta: {
        href: "https://example.invalid/other-official",
        label: draft.suggested_official_cta?.label ?? "Apply",
      },
    };
    const result = validate(mutated, evidence);
    expect(result.passed).toBe(false);
    expect(result.errors.some((error) => error.code === "INVALID_SOURCE_URL")).toBe(true);
  });

  it("rejects an unsafe monetary headline injected into the title", async () => {
    const { draft, evidence } = await pair(barRecord());
    draft.h1 = "Get up to $5,000 to retire an eligible vehicle";
    draft.seo_title = draft.h1;
    const result = validate(draft, evidence);
    expect(result.passed).toBe(false);
    expect(
      result.errors.some(
        (error) =>
          error.code === "UNSUPPORTED_TIER_AMOUNT" ||
          error.code === "UNMAPPED_CLAIM" ||
          error.code === "TITLE_OVERSTATES_ELIGIBILITY",
      ),
    ).toBe(true);
  });

  it("cannot strengthen generic sequencing into an unsupported specific action", async () => {
    const { draft, evidence, opportunity } = await pair(
      makeRecord({
        program: {
          category: "home-energy",
          subcategory: "charger-installation",
          purchase_before_approval_allowed: false,
        },
      }),
    );
    const original = draft.source_claims.find(
      (item) => item.claim_id === "how-to-apply-before-action",
    );
    expect(original?.text).toBe(GENERIC_SEQUENCING_COPY);

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
          ? {
              ...item,
              text: VEHICLE_RETIREMENT_SEQUENCING_COPY,
            }
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
