import { describe, expect, it } from "vitest";
import {
  makeLocation,
  makeProgram,
  makeRule,
} from "@/lib/eligibility/__tests__/fixtures";
import { programSummaryFacts } from "@/lib/programs/summary-facts";

describe("programSummaryFacts", () => {
  it("merges at-a-glance and eligibility facts without duplicate rows", () => {
    const program = makeProgram({
      administrator: "Sample California Air District",
      benefit_min: 1500,
      benefit_max: 3500,
      status: "ACTIVE",
      statewide: false,
      last_verified_at: "2026-08-01T00:00:00Z",
    });
    const facts = programSummaryFacts({
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
    const labels = facts.map((fact) => fact.label);
    expect(labels).toEqual([
      "Status",
      "Service area",
      "Income",
      "Housing",
      "Utility",
      "Administrator",
      "Last verified",
    ]);
    expect(labels.filter((label) => label === "Income")).toHaveLength(1);
    expect(labels.filter((label) => label === "Housing")).toHaveLength(1);
    expect(labels).not.toContain("Benefit");
    expect(labels).not.toContain("Who this is for");
    expect(facts.find((fact) => fact.label === "Income")?.value).toBe("Income limits apply");
    expect(facts.find((fact) => fact.label === "Housing")?.value).toBe("Homeowners");
    expect(facts.find((fact) => fact.label === "Utility")?.value).toBe("LADWP");
    expect(facts.find((fact) => fact.label === "Service area")?.value).toBe(
      "Available in Los Angeles County",
    );
  });

  it("uses a utility row instead of repeating a utility-only service area", () => {
    const program = makeProgram({ statewide: false, administrator: "SoCalGas" });
    const facts = programSummaryFacts({
      program,
      rules: [],
      locations: [
        makeLocation({
          program_id: program.id,
          location_type: "GAS_UTILITY",
          location_value: "SoCalGas",
        }),
      ],
    });
    expect(facts.find((fact) => fact.label === "Utility")?.value).toBe("SoCalGas");
    expect(facts.find((fact) => fact.label === "Service area")).toBeUndefined();
  });

  it("omits unknown income, housing, utility, and unconfirmed service area", () => {
    const program = makeProgram({
      statewide: false,
      administrator: null,
      last_verified_at: null,
      has_unmodeled_required_criteria: true,
      unmodeled_required_criteria_summary:
        "Income and homeowner details are not fully modeled.",
    });
    const facts = programSummaryFacts({
      program,
      rules: [],
      locations: [],
    });
    const blob = facts.map((fact) => `${fact.label}: ${fact.value}`).join(" | ");
    expect(facts.map((fact) => fact.label)).toEqual(["Status"]);
    expect(blob).not.toMatch(/no income/i);
    expect(blob).not.toMatch(/renters eligible/i);
    expect(blob).not.toMatch(/homeowners eligible/i);
    expect(blob).not.toMatch(/no utility/i);
    expect(blob).not.toContain("Service area needs to be confirmed");
    expect(blob).not.toContain("Income and homeowner details");
  });
});
