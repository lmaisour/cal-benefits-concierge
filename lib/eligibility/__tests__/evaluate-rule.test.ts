import { describe, expect, it } from "vitest";
import { evaluateRule } from "@/lib/eligibility/evaluate-rule";
import { makeProgram, makeRule } from "@/lib/eligibility/__tests__/fixtures";
import type { UserProfile } from "@/lib/eligibility/types";

const PROGRAM_ID = "program-test";

function rule(
  field: string,
  operator: Parameters<typeof makeRule>[0]["operator"],
  value: Parameters<typeof makeRule>[0]["value"] = null,
  extra: Partial<Parameters<typeof makeRule>[0]> = {},
) {
  return makeRule({
    program_id: PROGRAM_ID,
    field,
    operator,
    value,
    ...extra,
  });
}

describe("evaluateRule", () => {
  it("passes income exactly at a less_than_or_equal threshold", () => {
    const result = evaluateRule(
      rule("household_income", "less_than_or_equal", 80000),
      { household_income: 80000 },
    );
    expect(result.status).toBe("PASS");
    expect(result.explanation).toMatch(/household income appears to meet/i);
  });

  it("fails income above a less_than_or_equal threshold", () => {
    const result = evaluateRule(
      rule("household_income", "less_than_or_equal", 80000),
      { household_income: 80001 },
    );
    expect(result.status).toBe("FAIL");
    expect(result.explanation).toMatch(/above this program/i);
  });

  it("returns UNKNOWN when household_income is missing", () => {
    const result = evaluateRule(
      rule("household_income", "less_than_or_equal", 80000),
      {},
    );
    expect(result.status).toBe("UNKNOWN");
    expect(result.explanation).toMatch(/need your household income/i);
  });

  it("does not treat a missing number as zero", () => {
    const result = evaluateRule(
      rule("household_income", "greater_than", 0),
      {},
    );
    expect(result.status).toBe("UNKNOWN");
  });

  it("evaluates boolean is_true", () => {
    expect(
      evaluateRule(rule("first_ev", "is_true", true), { first_ev: true }).status,
    ).toBe("PASS");
    expect(
      evaluateRule(rule("first_ev", "is_true", true), { first_ev: false }).status,
    ).toBe("FAIL");
  });

  it("returns UNKNOWN when a boolean field is missing", () => {
    const result = evaluateRule(rule("first_ev", "is_true", true), {});
    expect(result.status).toBe("UNKNOWN");
  });

  it("does not treat a missing boolean as false", () => {
    const result = evaluateRule(rule("veteran", "is_false", false), {});
    expect(result.status).toBe("UNKNOWN");
  });

  it("evaluates is_false only against booleans", () => {
    expect(
      evaluateRule(rule("veteran", "is_false"), { veteran: false }).status,
    ).toBe("PASS");
    expect(
      evaluateRule(rule("veteran", "is_false"), { veteran: true }).status,
    ).toBe("FAIL");
  });

  it("evaluates in against an array of ZIP codes", () => {
    const zipRule = rule("zip", "in", ["91331", "90012"]);
    expect(evaluateRule(zipRule, { zip: "91331" }).status).toBe("PASS");
    expect(evaluateRule(zipRule, { zip: "10001" }).status).toBe("FAIL");
    expect(evaluateRule(zipRule, {}).status).toBe("UNKNOWN");
  });

  it("evaluates not_in", () => {
    const conditionRule = rule("vehicle_condition", "not_in", ["new"]);
    expect(evaluateRule(conditionRule, { vehicle_condition: "used" }).status).toBe(
      "PASS",
    );
    expect(evaluateRule(conditionRule, { vehicle_condition: "new" }).status).toBe(
      "FAIL",
    );
  });

  it("evaluates exists and not_exists without treating false as missing", () => {
    expect(evaluateRule(rule("zip", "exists"), { zip: "91331" }).status).toBe(
      "PASS",
    );
    expect(evaluateRule(rule("zip", "exists"), {}).status).toBe("FAIL");
    expect(evaluateRule(rule("owned_home", "not_exists"), {}).status).toBe("PASS");
    expect(
      evaluateRule(rule("owned_home", "not_exists"), { owned_home: false }).status,
    ).toBe("FAIL");
  });

  it("normalizes string equality with trim and case-insensitive compare", () => {
    const cityRule = rule("city", "equals", "Fresno");
    expect(evaluateRule(cityRule, { city: "  fresno  " }).status).toBe("PASS");
    expect(evaluateRule(cityRule, { city: "FRESNO" }).status).toBe("PASS");
    expect(evaluateRule(cityRule, { city: "Clovis" }).status).toBe("FAIL");
  });

  it("does not mutate the stored profile or rule value while normalizing", () => {
    const profile: UserProfile = { electric_utility: "  PG&E  " };
    const storedRule = rule("electric_utility", "equals", "pg&e");
    evaluateRule(storedRule, profile);
    expect(profile.electric_utility).toBe("  PG&E  ");
    expect(storedRule.value).toBe("pg&e");
  });

  it("compares numbers numerically", () => {
    expect(
      evaluateRule(rule("age", "greater_than_or_equal", 18), { age: 18 }).status,
    ).toBe("PASS");
    expect(
      evaluateRule(rule("age", "greater_than", 18), { age: 18 }).status,
    ).toBe("FAIL");
    expect(
      evaluateRule(rule("household_size", "less_than", 5), { household_size: 4 })
        .status,
    ).toBe("PASS");
    expect(
      evaluateRule(rule("vehicle_price", "greater_than", 40000), {
        vehicle_price: 39999,
      }).status,
    ).toBe("FAIL");
  });

  it("returns UNKNOWN for a malformed in value instead of throwing", () => {
    expect(evaluateRule(rule("zip", "in", "91331"), { zip: "91331" }).status).toBe(
      "UNKNOWN",
    );
    expect(
      evaluateRule(rule("zip", "in", { zips: ["91331"] }), { zip: "91331" })
        .status,
    ).toBe("UNKNOWN");
    expect(evaluateRule(rule("zip", "in", []), { zip: "91331" }).status).toBe(
      "UNKNOWN",
    );
  });

  it("returns UNKNOWN for an unrecognized operator instead of throwing", () => {
    const weird = rule("zip", "equals", "91331");
    const result = evaluateRule(
      { ...weird, operator: "approximately" as typeof weird.operator },
      { zip: "91331" },
    );
    expect(result.status).toBe("UNKNOWN");
  });

  it("supports contains for strings and arrays", () => {
    expect(
      evaluateRule(rule("city", "contains", "Fresno"), {
        city: "Fresno County pocket",
      }).status,
    ).toBe("PASS");
    expect(
      evaluateRule(rule("interests", "contains", "solar"), {
        interests: ["heat-pump", "Solar"],
      }).status,
    ).toBe("PASS");
    expect(
      evaluateRule(rule("interests", "contains", ["ev", "solar"]), {
        interests: ["weatherization", "SOLAR"],
      }).status,
    ).toBe("PASS");
    expect(
      evaluateRule(rule("interests", "contains", "solar"), {
        interests: ["weatherization"],
      }).status,
    ).toBe("FAIL");
  });

  it("does not stringify objects to compare them", () => {
    const result = evaluateRule(rule("city", "equals", { name: "Fresno" }), {
      city: "Fresno",
    });
    expect(result.status).toBe("UNKNOWN");
  });

  it("keeps a reference to the original rule on the evaluation", () => {
    const incomeRule = rule("household_income", "less_than", 65000);
    const result = evaluateRule(incomeRule, { household_income: 10000 });
    expect(result.rule).toBe(incomeRule);
    expect(makeProgram().id).toBe("program-test");
  });
});
