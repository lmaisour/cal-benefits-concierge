import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { atAGlanceItems, WHO_THIS_IS_FOR_LABEL } from "@/lib/programs/at-a-glance";
import {
  makeLocation,
  makeProgram,
  makeRule,
  statewideLocations,
} from "@/lib/eligibility/__tests__/fixtures";

function glanceValue(
  items: ReturnType<typeof atAGlanceItems>,
  label: string,
): string | undefined {
  return items.find((item) => item.label === label)?.value;
}

describe("atAGlanceItems", () => {
  it("does not invent income or homeownership facts from missing rules", () => {
    const program = makeProgram({
      administrator: "City Plants",
      benefit_type: "FREE_PRODUCT",
      benefit_min: null,
      benefit_max: null,
      benefit_summary: "Free street or yard trees",
      last_verified_at: "2026-09-10T00:00:00Z",
      has_unmodeled_required_criteria: true,
      unmodeled_required_criteria_summary:
        "Income and homeowner details are not fully modeled.",
    });
    const items = atAGlanceItems({
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
    const labels = items.map((item) => item.label);
    const blob = items.map((item) => `${item.label}: ${item.value}`).join(" | ");

    expect(labels).not.toContain("Income");
    expect(labels).not.toContain("Homeownership");
    expect(blob).not.toMatch(/no income requirement/i);
    expect(blob).not.toMatch(/homeowner not required/i);
    expect(blob).not.toMatch(/income and homeowner details/i);
    expect(glanceValue(items, WHO_THIS_IS_FOR_LABEL)).not.toMatch(/income/i);
    expect(glanceValue(items, WHO_THIS_IS_FOR_LABEL)).not.toMatch(/homeowner/i);
  });

  it("omits optional income rules and mixed housing-status choices", () => {
    const program = makeProgram();
    const items = atAGlanceItems({
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
      locations: statewideLocations(program.id),
    });
    expect(items.map((item) => item.label)).not.toContain("Income");
    expect(items.map((item) => item.label)).not.toContain("Homeownership");
    expect(glanceValue(items, WHO_THIS_IS_FOR_LABEL)).not.toMatch(/income/i);
    expect(glanceValue(items, WHO_THIS_IS_FOR_LABEL)).not.toMatch(/homeowner/i);
    expect(glanceValue(items, WHO_THIS_IS_FOR_LABEL)).not.toMatch(/renter/i);
  });

  it("displays structured facts when they are known", () => {
    const program = makeProgram({
      administrator: "Sample California Air District",
      benefit_min: 1500,
      benefit_max: 3500,
      status: "ACTIVE",
      statewide: false,
      last_verified_at: "2026-08-01T00:00:00Z",
    });
    const items = atAGlanceItems({
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
          location_type: "CITY",
          location_value: "Fresno",
        }),
      ],
    });
    const byLabel = Object.fromEntries(items.map((item) => [item.label, item.value]));

    expect(byLabel.Benefit).toBe("Up to $3,500");
    expect(byLabel["Current status"]).toBe("Active");
    expect(byLabel["Service area"]).toBe("Available in Fresno");
    expect(byLabel.Administrator).toBe("Sample California Air District");
    expect(byLabel.Income).toBe(
      "Household income must be at or below the sample threshold.",
    );
    expect(byLabel.Homeownership).toBe("You must own the home.");
    expect(byLabel["Last verified"]).toBe("Aug 1, 2026");
  });

  it("omits administrator and last verified when those values are absent", () => {
    const program = makeProgram({
      administrator: null,
      last_verified_at: null,
      benefit_type: "FREE_PRODUCT",
      benefit_min: null,
      benefit_max: null,
      benefit_summary: null,
    });
    const items = atAGlanceItems({
      program,
      rules: [],
      locations: statewideLocations(program.id),
    });
    const labels = items.map((item) => item.label);
    expect(labels).toContain("Benefit");
    expect(labels).toContain("Current status");
    expect(labels).toContain("Service area");
    expect(labels).not.toContain("Administrator");
    expect(labels).not.toContain("Last verified");
    expect(items.find((item) => item.label === "Benefit")?.value).toBe("Free product");
    expect(items.find((item) => item.label === "Service area")?.value).toBe(
      "Statewide in California",
    );
  });

  it("builds a safe Who this is for takeaway from geography and benefit", () => {
    const program = makeProgram({
      statewide: false,
      benefit_type: "FREE_PRODUCT",
      benefit_min: null,
      benefit_max: null,
      benefit_summary: null,
    });
    const items = atAGlanceItems({
      program,
      rules: [],
      locations: [
        makeLocation({
          program_id: program.id,
          location_type: "CITY",
          location_value: "Oakland",
        }),
      ],
    });
    expect(glanceValue(items, WHO_THIS_IS_FOR_LABEL)).toBe(
      "City of Oakland residents looking for a free product.",
    );
  });

  it("uses a concise structured benefit summary in Who this is for when available", () => {
    const program = makeProgram({
      statewide: false,
      benefit_type: "FREE_PRODUCT",
      benefit_min: null,
      benefit_max: null,
      benefit_summary: "Free trees",
    });
    const takeaway = glanceValue(
      atAGlanceItems({
        program,
        rules: [],
        locations: [
          makeLocation({
            program_id: program.id,
            location_type: "CITY",
            location_value: "Los Angeles",
          }),
        ],
      }),
      WHO_THIS_IS_FOR_LABEL,
    );
    expect(takeaway).toBe("City of Los Angeles residents looking for free trees.");
    expect(takeaway).not.toMatch(/a free product/i);
  });

  it("falls back to the generic benefit type when no concise summary exists", () => {
    const program = makeProgram({
      statewide: false,
      benefit_type: "FREE_PRODUCT",
      benefit_min: null,
      benefit_max: null,
      benefit_summary: null,
    });
    expect(
      glanceValue(
        atAGlanceItems({
          program,
          rules: [],
          locations: [
            makeLocation({
              program_id: program.id,
              location_type: "CITY",
              location_value: "Oakland",
            }),
          ],
        }),
        WHO_THIS_IS_FOR_LABEL,
      ),
    ).toBe("City of Oakland residents looking for a free product.");
  });

  it("does not turn an overly long benefit summary into a huge Who this is for takeaway", () => {
    const longSummary =
      "No-cost street and yard trees for eligible properties, including planting guidance, species options, watering expectations, and other application pathway details that vary by location.";
    const program = makeProgram({
      statewide: false,
      benefit_type: "FREE_PRODUCT",
      benefit_min: null,
      benefit_max: null,
      benefit_summary: longSummary,
    });
    const takeaway = glanceValue(
      atAGlanceItems({
        program,
        rules: [],
        locations: [
          makeLocation({
            program_id: program.id,
            location_type: "CITY",
            location_value: "Long Beach",
          }),
        ],
      }),
      WHO_THIS_IS_FOR_LABEL,
    );
    expect(takeaway).toBe("City of Long Beach residents looking for a free product.");
    expect(takeaway).not.toContain(longSummary);
    expect(takeaway?.length).toBeLessThan(120);
  });

  it("mentions modeled income only as published limits, without copying a numeric rule into the takeaway", () => {
    const program = makeProgram({
      statewide: false,
      benefit_type: "REBATE",
      benefit_min: 1500,
      benefit_max: 3500,
      benefit_summary: null,
    });
    const items = atAGlanceItems({
      program,
      rules: [
        makeRule({
          program_id: program.id,
          field: "household_income",
          operator: "less_than_or_equal",
          value: 80000,
          explanation: null,
        }),
      ],
      locations: [
        makeLocation({
          program_id: program.id,
          location_type: "COUNTY",
          location_value: "Los Angeles",
        }),
      ],
    });
    const takeaway = glanceValue(items, WHO_THIS_IS_FOR_LABEL);
    expect(takeaway).toBe(
      "Los Angeles County residents looking for a rebate who meet published income limits.",
    );
    expect(takeaway).not.toMatch(/80,?000/);
    expect(takeaway).not.toMatch(/\$/);
    expect(glanceValue(items, "Income")).toMatch(/household income/i);
  });

  it("does not invent an eligibility requirement in Who this is for when rules are missing", () => {
    const program = makeProgram({
      statewide: false,
      benefit_type: "REBATE",
      benefit_summary: null,
      has_unmodeled_required_criteria: true,
    });
    const takeaway = glanceValue(
      atAGlanceItems({
        program,
        rules: [],
        locations: [
          makeLocation({
            program_id: program.id,
            location_type: "CITY",
            location_value: "Sacramento",
          }),
        ],
      }),
      WHO_THIS_IS_FOR_LABEL,
    );
    expect(takeaway).toBe("City of Sacramento residents looking for a rebate.");
    expect(takeaway).not.toMatch(/income/i);
    expect(takeaway).not.toMatch(/homeowner/i);
    expect(takeaway).not.toMatch(/renter/i);
    expect(takeaway).not.toMatch(/anyone/i);
    expect(takeaway).not.toMatch(/no .*required/i);
  });

  it("does not hard-code program-specific Who this is for wording", () => {
    const source = readFileSync(
      path.join(process.cwd(), "lib/programs/at-a-glance.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/city plants/i);
    expect(source).not.toMatch(/free trees/i);
    expect(source).not.toMatch(/Los Angeles/);

    const cityA = makeProgram({
      statewide: false,
      benefit_type: "REBATE",
      benefit_summary: null,
    });
    const cityB = makeProgram({
      id: "program-b",
      statewide: false,
      benefit_type: "TAX_CREDIT",
      benefit_summary: null,
    });
    const takeawayA = glanceValue(
      atAGlanceItems({
        program: cityA,
        rules: [],
        locations: [
          makeLocation({
            program_id: cityA.id,
            location_type: "CITY",
            location_value: "Fresno",
          }),
        ],
      }),
      WHO_THIS_IS_FOR_LABEL,
    );
    const takeawayB = glanceValue(
      atAGlanceItems({
        program: cityB,
        rules: [],
        locations: [
          makeLocation({
            program_id: cityB.id,
            location_type: "CITY",
            location_value: "San Diego",
          }),
        ],
      }),
      WHO_THIS_IS_FOR_LABEL,
    );
    expect(takeawayA).toBe("City of Fresno residents looking for a rebate.");
    expect(takeawayB).toBe("City of San Diego residents looking for a tax credit.");
    expect(takeawayA).not.toBe(takeawayB);
  });
});
