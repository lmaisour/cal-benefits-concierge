import { describe, expect, it } from "vitest";
import { buildEvidencePackage } from "@/lib/content-pipeline/build-evidence-package";
import { makeRecord, NOW } from "./fixtures";

describe("buildEvidencePackage", () => {
  it("uses official sources and keeps structured facts separate from tags", () => {
    const evidence = buildEvidencePackage(makeRecord(), NOW);
    expect(evidence.official_sources.length).toBeGreaterThan(0);
    expect(evidence.official_sources.every((source) => source.url.startsWith("https://"))).toBe(
      true,
    );
    expect(evidence.official_name).toBe("Test Home Rebate");
    expect(evidence.eligibility.tags_are_not_eligibility).toBe(true);
    expect(evidence.eligibility.unknown_is_not_a_fact).toBe(true);
    expect(evidence.benefit.amounts_are_structured_facts).toBe(true);
    expect(evidence.benefit.amount_structure).toBe("UNKNOWN");
    expect(evidence.benefit.tiers).toEqual([]);
    expect(evidence.benefit.min).toBe(200);
    expect(evidence.deadline.application_deadline).toBe("2026-11-01");
    expect(evidence.deadline.source).toBe("structured");
  });

  it("does not invent benefit amounts when none are structured", () => {
    const evidence = buildEvidencePackage(
      makeRecord({
        program: { benefit_min: null, benefit_max: null, benefit_summary: "Free service" },
      }),
      NOW,
    );
    expect(evidence.benefit.min).toBeNull();
    expect(evidence.benefit.max).toBeNull();
    expect(evidence.benefit.amounts_are_structured_facts).toBe(false);
    expect(evidence.benefit.amount_structure).toBe("UNKNOWN");
  });

  it("surfaces unmodeled required eligibility as a warning, not a satisfied fact", () => {
    const evidence = buildEvidencePackage(
      makeRecord({
        program: {
          has_unmodeled_required_criteria: true,
          unmodeled_required_criteria_summary: "Applicant must be the head of household.",
        },
      }),
      NOW,
    );
    expect(evidence.eligibility.unmodeled_required).toBe(true);
    expect(evidence.warnings.join(" ")).toMatch(/head of household/i);
  });
});
