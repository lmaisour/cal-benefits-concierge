import { describe, expect, it } from "vitest";
import { makeProgram } from "@/lib/eligibility/__tests__/fixtures";
import { followupRowsFromCatalogSeeds } from "@/lib/programs/catalog-followup";

describe("followupRowsFromCatalogSeeds", () => {
  it("hydrates LEAP questions against the live program id", () => {
    const leap = makeProgram({
      id: "live-leap-id",
      external_id: "LADWP-WATER-LEAP",
    });
    const other = makeProgram({
      id: "other-id",
      external_id: "LA-HOME-CITY-PLANTS",
      slug: "city-plants-free-trees",
    });
    const { questions, rules } = followupRowsFromCatalogSeeds([leap, other]);
    expect(questions.map((item) => item.question_key)).toEqual([
      "ladwp_water_service",
      "front_yard_grass_size",
      "property_owner_permission",
    ]);
    expect(questions.every((item) => item.program_id === leap.id)).toBe(true);
    expect(rules).toHaveLength(3);
    expect(questions.some((item) => item.cta_label === "Check LEAP eligibility")).toBe(true);
    const permission = questions.find((item) => item.question_key === "property_owner_permission");
    expect(permission?.display_when_field).toBe("housing_status");
    expect(permission?.display_when_operator).toBe("not_equals");
    expect(permission?.display_when_value).toBe("owner");
    expect(rules.every((item) => item.satisfies_rule_group == null)).toBe(true);
  });

  it("hydrates LIFE questions with an income-group alternate pathway", () => {
    const life = makeProgram({
      id: "live-life-id",
      external_id: "LA-VEH-METRO-LIFE",
      slug: "la-metro-life",
    });
    const { questions, rules } = followupRowsFromCatalogSeeds([life]);
    expect(questions.map((item) => item.question_key)).toEqual([
      "life_qualifying_public_benefit",
      "life_other_transit_subsidy",
    ]);
    expect(questions.every((item) => item.program_id === life.id)).toBe(true);
    const benefitRule = rules.find((item) => item.question_id === questions[0]?.id);
    const transitRule = rules.find((item) => item.question_id === questions[1]?.id);
    expect(benefitRule?.satisfies_rule_group).toBe(1);
    expect(benefitRule?.expected_value).toBe("yes");
    expect(transitRule?.satisfies_rule_group).toBeNull();
    expect(transitRule?.expected_value).toBe("no");
  });

  it("returns nothing for programs without a catalog seed", () => {
    const program = makeProgram({ external_id: "CA-VEH-MYFIRSTEV" });
    expect(followupRowsFromCatalogSeeds([program])).toEqual({ questions: [], rules: [] });
  });
});
