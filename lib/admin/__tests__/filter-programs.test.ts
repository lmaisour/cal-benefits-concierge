import { describe, expect, it } from "vitest";
import { filterAdminPrograms } from "@/lib/admin/filter-programs";
import type { Program } from "@/types/program";

function program(overrides: Partial<Program>): Program {
  return {
    id: "1",
    external_id: null,
    name: "Example Rebate",
    slug: "example-rebate",
    administrator: "CARB",
    consumer_headline: null,
    administrator_display_name: null,
    audience_tags: null,
    category: "vehicles",
    subcategory: null,
    short_description: null,
    description: null,
    benefit_summary: "Up to $7,500",
    benefit_type: "REBATE",
    benefit_min: null,
    benefit_max: 7500,
    benefit_period: null,
    status: "ACTIVE",
    official_url: null,
    application_url: null,
    statewide: true,
    preapproval_required: null,
    purchase_before_approval_allowed: null,
    effective_start: null,
    effective_end: null,
    application_deadline: null,
    last_verified_at: "2026-09-01T00:00:00.000Z",
    confidence: "HIGH",
    featured: false,
    active: true,
    has_unmodeled_required_criteria: false,
    unmodeled_required_criteria_summary: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("filterAdminPrograms", () => {
  const programs = [
    program({ id: "1", name: "Clean Cars", administrator: "CARB" }),
    program({
      id: "2",
      name: "Weatherization",
      administrator: "CSD",
      category: "home-energy",
      status: "UNCERTAIN",
      confidence: "LOW",
    }),
  ];

  it("searches name and administrator", () => {
    expect(
      filterAdminPrograms(programs, {
        q: "carb",
        status: "",
        category: "",
        confidence: "",
        needsReview: false,
      }).map((item) => item.id),
    ).toEqual(["1"]);
  });

  it("filters needs review", () => {
    const now = Date.parse("2026-09-08T00:00:00.000Z");
    expect(
      filterAdminPrograms(
        programs,
        {
          q: "",
          status: "",
          category: "",
          confidence: "",
          needsReview: true,
        },
        now,
      ).map((item) => item.id),
    ).toEqual(["2"]);
  });
});
