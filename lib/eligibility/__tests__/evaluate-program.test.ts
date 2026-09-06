import { describe, expect, it } from "vitest";
import { evaluateProgram } from "@/lib/eligibility/evaluate-program";
import {
  makeProgram,
  makeRule,
  statewideLocations,
} from "@/lib/eligibility/__tests__/fixtures";

const PROGRAM = makeProgram({ id: "prog-and", statewide: true });
const LOCATIONS = statewideLocations(PROGRAM.id);

function incomeRule(required = true) {
  return makeRule({
    program_id: PROGRAM.id,
    field: "household_income",
    operator: "less_than_or_equal",
    value: 50000,
    required,
  });
}

function homeownerRule(required = true) {
  return makeRule({
    program_id: PROGRAM.id,
    field: "homeowner",
    operator: "is_true",
    value: true,
    required,
  });
}

describe("evaluateProgram", () => {
  it("returns LIKELY_ELIGIBLE when every required rule PASSes", () => {
    const evaluation = evaluateProgram(
      PROGRAM,
      [incomeRule(), homeownerRule()],
      LOCATIONS,
      { household_income: 40000, homeowner: true },
    );
    expect(evaluation.status).toBe("LIKELY_ELIGIBLE");
    expect(evaluation.passedRequiredRules).toHaveLength(2);
    expect(evaluation.failedRequiredRules).toHaveLength(0);
    expect(evaluation.unknownRequiredRules).toHaveLength(0);
  });

  it("returns NOT_ELIGIBLE when one required rule FAILs", () => {
    const evaluation = evaluateProgram(
      PROGRAM,
      [incomeRule(), homeownerRule()],
      LOCATIONS,
      { household_income: 90000, homeowner: true },
    );
    expect(evaluation.status).toBe("NOT_ELIGIBLE");
    expect(evaluation.failedRequiredRules).toHaveLength(1);
    expect(evaluation.failedRequiredRules[0]?.rule.field).toBe(
      "household_income",
    );
  });

  it("returns POSSIBLY_ELIGIBLE when one required rule is UNKNOWN", () => {
    const evaluation = evaluateProgram(
      PROGRAM,
      [incomeRule(), homeownerRule()],
      LOCATIONS,
      { homeowner: true },
    );
    expect(evaluation.status).toBe("POSSIBLY_ELIGIBLE");
    expect(evaluation.unknownRequiredRules).toHaveLength(1);
    expect(evaluation.unknownRequiredRules[0]?.rule.field).toBe(
      "household_income",
    );
  });

  it("does not disqualify when an optional rule FAILs", () => {
    const optionalFail = makeRule({
      program_id: PROGRAM.id,
      field: "has_children",
      operator: "is_true",
      value: true,
      required: false,
    });
    const evaluation = evaluateProgram(
      PROGRAM,
      [incomeRule(), optionalFail],
      LOCATIONS,
      { household_income: 20000, has_children: false },
    );
    expect(evaluation.status).toBe("LIKELY_ELIGIBLE");
    expect(evaluation.optionalRuleResults[0]?.status).toBe("FAIL");
  });

  it("AND group: any FAIL makes the group FAIL", () => {
    const evaluation = evaluateProgram(
      PROGRAM,
      [incomeRule(), homeownerRule()],
      LOCATIONS,
      { household_income: 20000, homeowner: false },
    );
    expect(evaluation.requiredGroups[0]?.status).toBe("FAIL");
    expect(evaluation.status).toBe("NOT_ELIGIBLE");
  });

  it("AND group: UNKNOWN without FAIL makes the group UNKNOWN", () => {
    const evaluation = evaluateProgram(
      PROGRAM,
      [incomeRule(), homeownerRule()],
      LOCATIONS,
      { household_income: 20000 },
    );
    expect(evaluation.requiredGroups[0]?.status).toBe("UNKNOWN");
    expect(evaluation.status).toBe("POSSIBLY_ELIGIBLE");
  });

  it("OR group with one PASS is PASS", () => {
    const owner = makeRule({
      program_id: PROGRAM.id,
      field: "housing_status",
      operator: "equals",
      value: "owner",
      rule_group: 2,
      group_operator: "OR",
    });
    const renter = makeRule({
      program_id: PROGRAM.id,
      field: "housing_status",
      operator: "equals",
      value: "renter",
      rule_group: 2,
      group_operator: "OR",
    });
    const evaluation = evaluateProgram(
      PROGRAM,
      [owner, renter],
      LOCATIONS,
      { housing_status: "renter" },
    );
    expect(evaluation.requiredGroups[0]?.status).toBe("PASS");
    expect(evaluation.status).toBe("LIKELY_ELIGIBLE");
    expect(evaluation.failedRequiredRules).toHaveLength(1);
    expect(evaluation.passedRequiredRules).toHaveLength(1);
  });

  it("OR group with all FAIL is FAIL", () => {
    const owner = makeRule({
      program_id: PROGRAM.id,
      field: "housing_status",
      operator: "equals",
      value: "owner",
      rule_group: 1,
      group_operator: "OR",
    });
    const renter = makeRule({
      program_id: PROGRAM.id,
      field: "housing_status",
      operator: "equals",
      value: "renter",
      rule_group: 1,
      group_operator: "OR",
    });
    const evaluation = evaluateProgram(
      PROGRAM,
      [owner, renter],
      LOCATIONS,
      { housing_status: "other" },
    );
    expect(evaluation.requiredGroups[0]?.status).toBe("FAIL");
    expect(evaluation.status).toBe("NOT_ELIGIBLE");
  });

  it("OR group with UNKNOWN and no PASS is UNKNOWN", () => {
    const owner = makeRule({
      program_id: PROGRAM.id,
      field: "housing_status",
      operator: "equals",
      value: "owner",
      rule_group: 1,
      group_operator: "OR",
    });
    const veteran = makeRule({
      program_id: PROGRAM.id,
      field: "veteran",
      operator: "is_true",
      value: true,
      rule_group: 1,
      group_operator: "OR",
    });
    const evaluation = evaluateProgram(
      PROGRAM,
      [owner, veteran],
      LOCATIONS,
      { housing_status: "renter" },
    );
    expect(evaluation.requiredGroups[0]?.status).toBe("UNKNOWN");
    expect(evaluation.status).toBe("POSSIBLY_ELIGIBLE");
  });
});
