import { describe, expect, it } from "vitest";
import { matchPrograms } from "@/lib/eligibility/match-programs";
import { evaluateProgram } from "@/lib/eligibility/evaluate-program";
import {
  matchingEvProfile,
  matchingWeatherizationProfile,
  valleyFirstEvLocations,
  valleyFirstEvProgram,
  valleyFirstEvRules,
  weatherizationLocations,
  weatherizationProgram,
  weatherizationRules,
} from "@/lib/eligibility/__tests__/fixtures";

describe("matchPrograms", () => {
  it("buckets seeded programs without calling a network", () => {
    const result = matchPrograms(
      [valleyFirstEvProgram, weatherizationProgram],
      [...valleyFirstEvRules, ...weatherizationRules],
      [...valleyFirstEvLocations, ...weatherizationLocations],
      {
        ...matchingEvProfile,
        ...matchingWeatherizationProfile,
        zip: "91331",
        household_income: 42000,
      },
    );

    expect(result.likelyEligible.map((item) => item.program.slug)).toEqual([
      "sample-valley-first-ev-rebate",
      "sample-warm-walls-weatherization",
    ]);
    expect(result.possiblyEligible).toHaveLength(0);
    expect(result.notEligible).toHaveLength(0);
  });

  it("keeps input order inside each bucket", () => {
    const highIncome = {
      ...matchingEvProfile,
      ...matchingWeatherizationProfile,
      household_income: 200000,
      zip: "10001",
      gas_utility: "Other",
    };
    const result = matchPrograms(
      [valleyFirstEvProgram, weatherizationProgram],
      [...valleyFirstEvRules, ...weatherizationRules],
      [...valleyFirstEvLocations, ...weatherizationLocations],
      highIncome,
    );
    expect(result.notEligible.map((item) => item.program.id)).toEqual([
      valleyFirstEvProgram.id,
      weatherizationProgram.id,
    ]);
  });
});

describe("seeded programs", () => {
  it("marks a complete Valley First EV profile as LIKELY_ELIGIBLE", () => {
    const evaluation = evaluateProgram(
      valleyFirstEvProgram,
      valleyFirstEvRules,
      valleyFirstEvLocations,
      matchingEvProfile,
    );
    expect(evaluation.status).toBe("LIKELY_ELIGIBLE");
    expect(evaluation.geography.status).toBe("PASS");
    expect(evaluation.ruleResults[0]?.explanation).toBeTruthy();
  });

  it("marks Valley First EV over the income cap as NOT_ELIGIBLE", () => {
    const evaluation = evaluateProgram(
      valleyFirstEvProgram,
      valleyFirstEvRules,
      valleyFirstEvLocations,
      { ...matchingEvProfile, household_income: 120000 },
    );
    expect(evaluation.status).toBe("NOT_ELIGIBLE");
    expect(
      evaluation.failedRequiredRules.some(
        (result) => result.rule.field === "household_income",
      ),
    ).toBe(true);
  });

  it("marks Valley First EV without income as POSSIBLY_ELIGIBLE", () => {
    const partial = {
      zip: matchingEvProfile.zip,
      first_ev: matchingEvProfile.first_ev,
      vehicle_price: matchingEvProfile.vehicle_price,
      vehicle_condition: matchingEvProfile.vehicle_condition,
    };
    const evaluation = evaluateProgram(
      valleyFirstEvProgram,
      valleyFirstEvRules,
      valleyFirstEvLocations,
      partial,
    );
    expect(evaluation.status).toBe("POSSIBLY_ELIGIBLE");
  });

  it("marks a renter who meets Warm Walls rules as LIKELY_ELIGIBLE", () => {
    const evaluation = evaluateProgram(
      weatherizationProgram,
      weatherizationRules,
      weatherizationLocations,
      matchingWeatherizationProfile,
    );
    expect(evaluation.status).toBe("LIKELY_ELIGIBLE");
    const housingGroup = evaluation.requiredGroups.find(
      (group) => group.ruleGroup === 2,
    );
    expect(housingGroup?.operator).toBe("OR");
    expect(housingGroup?.status).toBe("PASS");
  });

  it("does not claim official eligibility in explanations", () => {
    const evaluation = evaluateProgram(
      valleyFirstEvProgram,
      valleyFirstEvRules,
      valleyFirstEvLocations,
      matchingEvProfile,
    );
    const text = [
      evaluation.geography.explanation,
      ...evaluation.ruleResults.map((result) => result.explanation),
    ].join(" ");
    expect(text.toLowerCase()).not.toMatch(/you qualify/);
    expect(text.toLowerCase()).not.toMatch(/% eligible/);
  });
});
