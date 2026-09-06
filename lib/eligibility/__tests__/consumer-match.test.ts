import { describe, expect, it } from "vitest";
import {
  PURCHASE_BEFORE_APPROVAL_WARNING,
  REPAYABLE_NOTICE,
  financingIsRepayable,
  toConsumerProgramMatch,
  toMatchResponse,
} from "@/lib/eligibility/consumer-match";
import { evaluateProgram } from "@/lib/eligibility/evaluate-program";
import { matchPrograms } from "@/lib/eligibility/match-programs";
import {
  makeProgram,
  makeRule,
  matchingEvProfile,
  statewideLocations,
  valleyFirstEvLocations,
  valleyFirstEvProgram,
  valleyFirstEvRules,
} from "@/lib/eligibility/__tests__/fixtures";

describe("toMatchResponse", () => {
  it("omits NOT_ELIGIBLE programs", () => {
    const result = matchPrograms(
      [valleyFirstEvProgram],
      valleyFirstEvRules,
      valleyFirstEvLocations,
      { ...matchingEvProfile, household_income: 200000, household_size: 2, housing_status: "owner", property_type: "single_family" },
    );
    expect(result.notEligible.length).toBeGreaterThan(0);
    const consumer = toMatchResponse(result);
    expect(consumer.likelyEligible).toHaveLength(0);
    expect(consumer.possiblyEligible).toHaveLength(0);
    expect(consumer.counts).toEqual({ likely: 0, possible: 0 });
  });

  it("does not repeat the same housing-status reason twice", () => {
    const program = makeProgram({
      id: "housing-dup",
      statewide: true,
    });
    const evaluation = evaluateProgram(
      program,
      [
        makeRule({
          program_id: program.id,
          field: "housing_status",
          operator: "equals",
          value: "owner",
        }),
        makeRule({
          program_id: program.id,
          field: "homeowner",
          operator: "is_true",
          value: true,
        }),
      ],
      statewideLocations(program.id),
      { housing_status: "owner", homeowner: true },
    );
    const match = toConsumerProgramMatch(evaluation);
    const housingReasons = match?.whyMatched.filter((reason) =>
      reason.toLowerCase().includes("housing status"),
    );
    expect(housingReasons).toHaveLength(1);
  });

  it("maps a likely match correctly", () => {
    const evaluation = evaluateProgram(
      valleyFirstEvProgram,
      valleyFirstEvRules,
      valleyFirstEvLocations,
      matchingEvProfile,
    );
    const match = toConsumerProgramMatch(evaluation);
    expect(match).not.toBeNull();
    expect(match?.eligibilityStatus).toBe("LIKELY_ELIGIBLE");
    expect(match?.slug).toBe("sample-valley-first-ev-rebate");
    expect(match?.whyMatched.length).toBeGreaterThan(0);
    expect(match?.whyMatched.length).toBeLessThanOrEqual(3);
    expect(match?.whyMatched.join(" ")).toMatch(/household income|ZIP|housing/i);
    expect(match?.whyMatched.join(" ").toLowerCase()).not.toMatch(/you qualify/);
    expect(match?.isSample).toBe(true);
    expect(match?.valueKind).toBe("savings");
    expect(match?.valueText).toMatch(/Up to/);
  });

  it("includes missing fields on a possible match and deduplicates them", () => {
    const program = makeProgram({ id: "dup-unknown", statewide: true });
    const rules = [
      makeRule({
        program_id: program.id,
        field: "household_income",
        operator: "less_than_or_equal",
        value: 50000,
      }),
      makeRule({
        program_id: program.id,
        field: "household_income",
        operator: "greater_than",
        value: 0,
        rule_group: 2,
      }),
    ];
    const evaluation = evaluateProgram(program, rules, statewideLocations(program.id), {
      zip: "91331",
      household_size: 2,
      housing_status: "owner",
      property_type: "single_family",
    });
    expect(evaluation.status).toBe("POSSIBLY_ELIGIBLE");
    const match = toConsumerProgramMatch(evaluation);
    expect(match?.missingInformation).toEqual(["Household income"]);
  });

  it("adds the purchase-before-approval warning", () => {
    const evaluation = evaluateProgram(
      valleyFirstEvProgram,
      valleyFirstEvRules,
      valleyFirstEvLocations,
      matchingEvProfile,
    );
    const match = toConsumerProgramMatch(evaluation);
    expect(match?.importantWarning).toBe(PURCHASE_BEFORE_APPROVAL_WARNING);
  });

  it("does not present loan or financing as free savings", () => {
    const program = makeProgram({
      id: "loan-1",
      benefit_type: "FINANCING",
      benefit_min: null,
      benefit_max: 25000,
      purchase_before_approval_allowed: true,
    });
    const evaluation = evaluateProgram(
      program,
      [
        makeRule({
          program_id: program.id,
          field: "housing_status",
          operator: "equals",
          value: "owner",
        }),
      ],
      statewideLocations(program.id),
      { housing_status: "owner" },
    );
    const match = toConsumerProgramMatch(evaluation);
    expect(match?.valueKind).toBe("financing");
    expect(match?.valueText).toMatch(/^Financing up to/);
    expect(match?.valueKind).not.toBe("savings");
    expect(financingIsRepayable("FINANCING")).toBe(true);
    expect(financingIsRepayable("LOAN")).toBe(true);
    expect(REPAYABLE_NOTICE).toMatch(/not free savings/i);
  });
});
