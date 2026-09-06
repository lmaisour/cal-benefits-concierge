import { describe, expect, it } from "vitest";
import { programCatalog } from "@/data/programs/index";
import { UNMODELED_REQUIRED_CRITERIA_MESSAGE } from "@/data/programs/unmodeled-criteria";
import {
  additionalRequirementsFor,
  toConsumerProgramMatch,
} from "@/lib/eligibility/consumer-match";
import { evaluateProgram } from "@/lib/eligibility/evaluate-program";
import { matchPrograms } from "@/lib/eligibility/match-programs";
import { validateUserProfile } from "@/lib/eligibility/validate-profile";
import { consumerVisiblePrograms } from "@/lib/programs/import/catalog-to-engine";
import {
  makeProgram,
  makeRule,
  statewideLocations,
} from "@/lib/eligibility/__tests__/fixtures";

const PROGRAM = makeProgram({ id: "unmodeled-base", statewide: true });
const LOCATIONS = statewideLocations(PROGRAM.id);
const incomeRule = makeRule({
  program_id: PROGRAM.id,
  field: "household_income",
  operator: "less_than_or_equal",
  value: 50000,
});

const visible = consumerVisiblePrograms(programCatalog);

function catalogProgram(slug: string) {
  const program = visible.programs.find((item) => item.slug === slug);
  if (!program) {
    throw new Error(`Missing catalog program ${slug}`);
  }
  return program;
}

function evaluateCatalog(slug: string, profile: Parameters<typeof evaluateProgram>[3]) {
  const program = catalogProgram(slug);
  return evaluateProgram(
    program,
    visible.rules.filter((rule) => rule.program_id === program.id),
    visible.locations.filter((location) => location.program_id === program.id),
    profile,
  );
}

describe("unmodeled required criteria", () => {
  it("returns LIKELY when all executable rules pass and there are no unmodeled criteria", () => {
    const evaluation = evaluateProgram(
      PROGRAM,
      [incomeRule],
      LOCATIONS,
      { household_income: 40000 },
    );
    expect(evaluation.hasUnmodeledRequiredCriteria).toBe(false);
    expect(evaluation.status).toBe("LIKELY_ELIGIBLE");
    expect(additionalRequirementsFor(evaluation)).toBeNull();
  });

  it("returns POSSIBLE when all executable rules pass but unmodeled criteria exist", () => {
    const program = makeProgram({
      id: "unmodeled-pass",
      statewide: true,
      has_unmodeled_required_criteria: true,
      unmodeled_required_criteria_summary:
        "A qualifying child must be under 6, and you generally must also qualify for CalEITC.",
    });
    const evaluation = evaluateProgram(
      program,
      [
        makeRule({
          program_id: program.id,
          field: "has_children",
          operator: "is_true",
          value: true,
        }),
      ],
      statewideLocations(program.id),
      { has_children: true },
    );
    expect(evaluation.status).toBe("POSSIBLY_ELIGIBLE");
    expect(evaluation.failedRequiredRules).toHaveLength(0);
    expect(evaluation.unknownRequiredRules).toHaveLength(0);
    expect(additionalRequirementsFor(evaluation)).toBe(
      "A qualifying child must be under 6, and you generally must also qualify for CalEITC.",
    );
    expect(toConsumerProgramMatch(evaluation)?.additionalRequirements).toBe(
      "A qualifying child must be under 6, and you generally must also qualify for CalEITC.",
    );
  });

  it("returns NOT_ELIGIBLE when an executable required rule fails, even with unmodeled criteria", () => {
    const program = makeProgram({
      id: "unmodeled-fail",
      statewide: true,
      has_unmodeled_required_criteria: true,
      unmodeled_required_criteria_summary: "Income tables still need to be confirmed.",
    });
    const evaluation = evaluateProgram(
      program,
      [
        makeRule({
          program_id: program.id,
          field: "household_income",
          operator: "less_than_or_equal",
          value: 50000,
        }),
      ],
      statewideLocations(program.id),
      { household_income: 90000 },
    );
    expect(evaluation.status).toBe("NOT_ELIGIBLE");
    expect(toConsumerProgramMatch(evaluation)).toBeNull();
  });

  it("returns POSSIBLE when a required rule is UNKNOWN and unmodeled criteria also exist", () => {
    const program = makeProgram({
      id: "unmodeled-unknown",
      statewide: true,
      has_unmodeled_required_criteria: true,
      unmodeled_required_criteria_summary: null,
    });
    const evaluation = evaluateProgram(
      program,
      [
        makeRule({
          program_id: program.id,
          field: "household_income",
          operator: "less_than_or_equal",
          value: 50000,
        }),
      ],
      statewideLocations(program.id),
      {},
    );
    expect(evaluation.status).toBe("POSSIBLY_ELIGIBLE");
    expect(evaluation.unknownRequiredRules).toHaveLength(1);
    expect(additionalRequirementsFor(evaluation)).toBe(
      UNMODELED_REQUIRED_CRITERIA_MESSAGE,
    );
  });

  it("does not make Young Child Tax Credit Likely merely because has_children is true", () => {
    const evaluation = evaluateCatalog("young-child-tax-credit", {
      has_children: true,
      household_income: 18000,
      household_size: 2,
      zip: "94110",
    });
    expect(evaluation.program.has_unmodeled_required_criteria).toBe(true);
    expect(evaluation.status).toBe("POSSIBLY_ELIGIBLE");
    expect(evaluation.failedRequiredRules).toHaveLength(0);
    expect(toConsumerProgramMatch(evaluation)?.additionalRequirements).toMatch(
      /under 6|CalEITC/i,
    );
  });

  it("does not make Foster Youth Tax Credit Likely from age alone", () => {
    const evaluation = evaluateCatalog("foster-youth-tax-credit", {
      age: 22,
      zip: "95814",
      household_size: 1,
      household_income: 16000,
    });
    expect(evaluation.program.has_unmodeled_required_criteria).toBe(true);
    expect(evaluation.status).toBe("POSSIBLY_ELIGIBLE");
    expect(evaluation.failedRequiredRules).toHaveLength(0);
    expect(toConsumerProgramMatch(evaluation)?.additionalRequirements).toMatch(
      /18–25|foster/i,
    );
  });

  it("keeps an income-tested program without implemented income logic Possible", () => {
    const evaluation = evaluateCatalog("calfresh", {
      zip: "90011",
      household_size: 3,
      household_income: 24000,
      housing_status: "renter",
    });
    expect(evaluation.program.has_unmodeled_required_criteria).toBe(true);
    expect(evaluation.status).toBe("POSSIBLY_ELIGIBLE");
    expect(toConsumerProgramMatch(evaluation)?.additionalRequirements).toMatch(
      /income|CalFresh/i,
    );
  });

  it("keeps CARE Possible when utility rules pass because the FPL table is unmodeled", () => {
    const evaluation = evaluateCatalog("california-alternate-rates-for-energy", {
      zip: "90011",
      household_size: 3,
      household_income: 42000,
      electric_utility: "SCE",
      gas_utility: "SoCalGas",
    });
    expect(evaluation.status).toBe("POSSIBLY_ELIGIBLE");
    expect(evaluation.failedRequiredRules).toHaveLength(0);
  });
});

describe("catalog unmodeled-criteria audit", () => {
  it("marks the named tax, food, and utility examples", () => {
    const bySlug = new Map(programCatalog.programs.map((program) => [program.slug, program]));
    expect(bySlug.get("young-child-tax-credit")?.has_unmodeled_required_criteria).toBe(true);
    expect(bySlug.get("foster-youth-tax-credit")?.has_unmodeled_required_criteria).toBe(true);
    expect(bySlug.get("calfresh")?.has_unmodeled_required_criteria).toBe(true);
    expect(bySlug.get("california-alternate-rates-for-energy")?.has_unmodeled_required_criteria).toBe(
      true,
    );
    expect(bySlug.get("homeowners-property-tax-exemption")?.has_unmodeled_required_criteria).toBe(
      false,
    );
  });

  it("does not invent fake PASS/FAIL rules for unmodeled criteria", () => {
    const result = matchPrograms(
      visible.programs,
      visible.rules,
      visible.locations,
      validateUserProfile({
        has_children: true,
        age: 22,
        household_income: 20000,
        household_size: 2,
        zip: "94110",
      }).ok
        ? {
            has_children: true,
            age: 22,
            household_income: 20000,
            household_size: 2,
            zip: "94110",
          }
        : {},
    );
    const yctc = [...result.likelyEligible, ...result.possiblyEligible, ...result.notEligible].find(
      (item) => item.program.slug === "young-child-tax-credit",
    );
    expect(yctc?.ruleResults.every((item) => item.rule.field !== "caleitc")).toBe(true);
    expect(yctc?.status).toBe("POSSIBLY_ELIGIBLE");
  });
});
