import { describe, expect, it } from "vitest";
import {
  makeLocation,
  makeProgram,
  makeRule,
} from "@/lib/eligibility/__tests__/fixtures";
import { eligibilityHighlightFacts } from "@/lib/programs/eligibility-facts";

describe("eligibilityHighlightFacts", () => {
  it("displays modeled location, income, housing, and utility facts", () => {
    const program = makeProgram({ statewide: false });
    const facts = eligibilityHighlightFacts({
      program,
      rules: [
        makeRule({
          program_id: program.id,
          field: "household_income",
          operator: "less_than_or_equal",
          value: 80000,
          explanation: "Household income must be at or below the sample threshold.",
        }),
        makeRule({
          program_id: program.id,
          field: "homeowner",
          operator: "is_true",
          value: true,
          explanation: "You must own the home.",
        }),
      ],
      locations: [
        makeLocation({
          program_id: program.id,
          location_type: "COUNTY",
          location_value: "Los Angeles",
        }),
        makeLocation({
          program_id: program.id,
          location_type: "ELECTRIC_UTILITY",
          location_value: "LADWP",
        }),
      ],
    });
    expect(facts).toEqual([
      { label: "Location", value: "Los Angeles County" },
      { label: "Income", value: "Income limits apply" },
      { label: "Housing", value: "Homeowners" },
      { label: "Utility", value: "LADWP" },
    ]);
  });

  it("does not invent eligibility when rules are missing", () => {
    const program = makeProgram({
      statewide: false,
      has_unmodeled_required_criteria: false,
    });
    const facts = eligibilityHighlightFacts({
      program,
      rules: [],
      locations: [
        makeLocation({
          program_id: program.id,
          location_type: "CITY",
          location_value: "Los Angeles",
        }),
      ],
    });
    const blob = facts.map((fact) => `${fact.label}: ${fact.value}`).join(" | ");
    expect(facts.map((fact) => fact.label)).toEqual(["Location"]);
    expect(blob).not.toMatch(/no income/i);
    expect(blob).not.toMatch(/renters eligible/i);
    expect(blob).not.toMatch(/homeowners eligible/i);
    expect(blob).not.toMatch(/no utility/i);
    expect(facts.some((fact) => fact.label === "Income")).toBe(false);
    expect(facts.some((fact) => fact.label === "Housing")).toBe(false);
    expect(facts.some((fact) => fact.label === "Utility")).toBe(false);
  });

  it("stays conservative when required criteria are unmodeled", () => {
    const program = makeProgram({
      statewide: false,
      has_unmodeled_required_criteria: true,
      unmodeled_required_criteria_summary:
        "Income and homeowner details are not fully modeled.",
    });
    const facts = eligibilityHighlightFacts({
      program,
      rules: [
        makeRule({
          program_id: program.id,
          field: "household_income",
          operator: "less_than_or_equal",
          value: 50000,
          required: false,
          explanation: "Optional income adder.",
        }),
        makeRule({
          program_id: program.id,
          field: "housing_status",
          operator: "in",
          value: ["owner", "renter"],
          explanation: "Owners or renters may apply.",
        }),
      ],
      locations: [
        makeLocation({
          program_id: program.id,
          location_type: "CITY",
          location_value: "Los Angeles",
        }),
      ],
    });
    const blob = facts.map((fact) => `${fact.label}: ${fact.value}`).join(" | ");
    expect(facts.map((fact) => fact.label)).toEqual(["Location"]);
    expect(blob).not.toMatch(/income limits apply/i);
    expect(blob).not.toMatch(/homeowners/i);
    expect(blob).not.toMatch(/renters/i);
    expect(blob).not.toMatch(/no income restriction/i);
    expect(blob).not.toContain("Income and homeowner details");
  });
});
