import { describe, expect, it } from "vitest";
import { toMatchResponse } from "@/lib/eligibility/consumer-match";
import { matchPrograms } from "@/lib/eligibility/match-programs";
import { validateUserProfile } from "@/lib/eligibility/validate-profile";
import {
  valleyFirstEvLocations,
  valleyFirstEvProgram,
  valleyFirstEvRules,
  weatherizationLocations,
  weatherizationProgram,
  weatherizationRules,
} from "@/lib/eligibility/__tests__/fixtures";

const programs = [valleyFirstEvProgram, weatherizationProgram];
const rules = [...valleyFirstEvRules, ...weatherizationRules];
const locations = [...valleyFirstEvLocations, ...weatherizationLocations];

const completedLikely = {
  zip: "91331",
  household_size: 2,
  housing_status: "renter" as const,
  property_type: "single_family" as const,
  household_income: 42000,
  homeowner: false,
  owned_zev_before: false,
  first_ev: true,
  vehicle_price: 32000,
  vehicle_condition: "new" as const,
  gas_utility: "SoCalGas",
};

describe("matching integration (fixtures, no network)", () => {
  it("produces expected likely buckets for a realistic completed profile", () => {
    const validated = validateUserProfile(completedLikely);
    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }

    const consumer = toMatchResponse(
      matchPrograms(programs, rules, locations, validated.profile),
    );
    expect(consumer.likelyEligible.map((item) => item.slug)).toEqual([
      "sample-valley-first-ev-rebate",
      "sample-warm-walls-weatherization",
    ]);
    expect(consumer.possiblyEligible).toHaveLength(0);
    expect(consumer.counts.likely).toBe(2);
  });

  it("converts an otherwise likely program to possible when income is missing", () => {
    const { household_income, ...withoutIncome } = completedLikely;
    expect(household_income).toBe(42000);
    const validated = validateUserProfile(withoutIncome);
    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }

    const consumer = toMatchResponse(
      matchPrograms(programs, rules, locations, validated.profile),
    );
    expect(consumer.likelyEligible).toHaveLength(0);
    expect(consumer.possiblyEligible.map((item) => item.slug)).toEqual([
      "sample-valley-first-ev-rebate",
      "sample-warm-walls-weatherization",
    ]);
    expect(
      consumer.possiblyEligible.every((item) =>
        item.missingInformation.includes("Household income"),
      ),
    ).toBe(true);
  });

  it("removes a program from the consumer result when a required rule conflicts", () => {
    const validated = validateUserProfile({
      ...completedLikely,
      household_income: 200000,
    });
    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }

    const engine = matchPrograms(programs, rules, locations, validated.profile);
    expect(engine.notEligible.length).toBe(2);
    const consumer = toMatchResponse(engine);
    expect(consumer.likelyEligible).toHaveLength(0);
    expect(consumer.possiblyEligible).toHaveLength(0);
  });
});
