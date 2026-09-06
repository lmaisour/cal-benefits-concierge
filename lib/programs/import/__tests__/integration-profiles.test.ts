import { describe, expect, it } from "vitest";
import { programCatalog } from "@/data/programs/index";
import { toMatchResponse } from "@/lib/eligibility/consumer-match";
import { matchPrograms } from "@/lib/eligibility/match-programs";
import type { UserProfile } from "@/lib/eligibility/types";
import { validateUserProfile } from "@/lib/eligibility/validate-profile";
import { consumerVisiblePrograms } from "@/lib/programs/import/catalog-to-engine";
import { isRepayableBenefit } from "@/lib/programs/labels";

const visible = consumerVisiblePrograms(programCatalog);

function match(profile: UserProfile) {
  const validated = validateUserProfile(profile);
  expect(validated.ok).toBe(true);
  if (!validated.ok) {
    throw new Error("profile should validate");
  }
  return toMatchResponse(
    matchPrograms(visible.programs, visible.rules, visible.locations, validated.profile),
  );
}

function names(items: { name: string }[]) {
  return items.map((item) => item.name);
}

describe("Milestone 7A local integration profiles", () => {
  it("does not expose SAMPLE, expired, or repayable-as-free-savings programs", () => {
    for (const program of visible.programs) {
      expect(program.name.startsWith("SAMPLE:")).toBe(false);
      expect(program.status).not.toBe("EXPIRED");
      expect(program.confidence).not.toBe("LOW");
    }
  });

  it("lower-income LA County homeowner: defensible likely, conservative county programs", () => {
    const result = match({
      zip: "90011",
      household_size: 3,
      household_income: 42000,
      housing_status: "owner",
      homeowner: true,
      property_type: "single_family",
      age: 44,
      electric_utility: "SCE",
      gas_utility: "SoCalGas",
      interests: ["home-energy", "utilities", "housing"],
    });

    expect(result.likelyEligible.some((item) => item.slug === "california-alternate-rates-for-energy")).toBe(
      true,
    );
    expect(result.likelyEligible.some((item) => item.slug === "homeowners-property-tax-exemption")).toBe(
      true,
    );
    expect(result.likelyEligible.every((item) => item.name.startsWith("SAMPLE:"))).toBe(false);
    expect(
      result.likelyEligible.some((item) => item.slug === "lacda-handyworker"),
    ).toBe(false);
    const handyworker = result.possiblyEligible.find((item) => item.slug === "lacda-handyworker");
    expect(handyworker).toBeDefined();
    expect(handyworker?.missingInformation).toContain("County");
  });

  it("LADWP renter: municipal discount can match; CARE is not forced", () => {
    const result = match({
      zip: "90012",
      household_size: 2,
      household_income: 28000,
      housing_status: "renter",
      homeowner: false,
      property_type: "apartment",
      electric_utility: "LADWP",
      gas_utility: "SoCalGas",
      interests: ["utilities"],
    });

    expect(result.likelyEligible.some((item) => item.slug === "ladwp-ez-save")).toBe(true);
    expect(names(result.likelyEligible)).not.toContain("DAC-SASH");
    const care = [...result.likelyEligible, ...result.possiblyEligible].find(
      (item) => item.slug === "california-alternate-rates-for-energy",
    );
    expect(care).toBeDefined();
  });

  it("first-EV buyer: MyFirstEV can be likely without inventing dealer rules", () => {
    const result = match({
      zip: "94110",
      household_size: 2,
      household_income: 65000,
      housing_status: "renter",
      homeowner: false,
      property_type: "apartment",
      first_ev: true,
      owned_zev_before: false,
      vehicle_condition: "new",
      vehicle_price: 32000,
      electric_utility: "PG&E",
      gas_utility: "PG&E",
      interests: ["vehicles"],
    });

    const myFirst = result.likelyEligible.find((item) => item.slug === "myfirstev");
    expect(myFirst).toBeDefined();
    expect(myFirst?.whyMatched.some((reason) => /first/i.test(reason))).toBe(true);
  });

  it("omitted income stays Possible rather than false Likely when income is required", () => {
    const result = match({
      zip: "91331",
      household_size: 2,
      housing_status: "renter",
      homeowner: false,
      property_type: "single_family",
      first_ev: true,
      vehicle_price: 32000,
      vehicle_condition: "new",
      electric_utility: "SCE",
      gas_utility: "SoCalGas",
    });

    expect(result.likelyEligible.some((item) => item.slug === "myfirstev")).toBe(true);
    expect(
      [...result.likelyEligible, ...result.possiblyEligible].every(
        (item) => item.status !== "EXPIRED" && !item.name.startsWith("SAMPLE:"),
      ),
    ).toBe(true);
  });

  it("senior homeowner: senior grant is Possible without county, not a false Likely", () => {
    const result = match({
      zip: "90210",
      household_size: 1,
      household_income: 30000,
      housing_status: "owner",
      homeowner: true,
      property_type: "single_family",
      age: 72,
      electric_utility: "SCE",
      gas_utility: "SoCalGas",
      interests: ["housing", "home-energy"],
    });

    const senior = [...result.likelyEligible, ...result.possiblyEligible].find(
      (item) => item.slug === "lacda-senior-grant",
    );
    expect(senior?.eligibilityStatus).toBe("POSSIBLY_ELIGIBLE");
    expect(result.likelyEligible.some((item) => item.slug === "homeowners-property-tax-exemption")).toBe(
      true,
    );
  });

  it("solar/storage interest does not invent DAC geography as Likely", () => {
    const result = match({
      zip: "93706",
      household_size: 4,
      household_income: 38000,
      housing_status: "owner",
      homeowner: true,
      property_type: "single_family",
      electric_utility: "PG&E",
      gas_utility: "PG&E",
      home_improvement_interest: true,
      interests: ["home-energy"],
    });

    const dacSash = [...result.likelyEligible, ...result.possiblyEligible].find(
      (item) => item.slug === "dac-sash",
    );
    expect(dacSash).toBeDefined();
    expect(
      result.likelyEligible.some((item) => item.slug === "sgip-residential-solar-storage-equity"),
    ).toBe(false);
    expect(
      result.possiblyEligible.some((item) => item.slug === "sgip-residential-solar-storage-equity"),
    ).toBe(false);
  });

  it("medical-energy need can surface Medical Baseline without a guessed diagnosis rule", () => {
    const result = match({
      zip: "95814",
      household_size: 2,
      household_income: 40000,
      housing_status: "owner",
      homeowner: true,
      property_type: "single_family",
      disability: true,
      electric_utility: "SMUD",
      gas_utility: "PG&E",
      interests: ["utilities"],
    });

    const medical = [...result.likelyEligible, ...result.possiblyEligible].find(
      (item) => item.slug === "medical-baseline-allowance",
    );
    expect(medical).toBeDefined();
  });

  it("first-time homebuyer financing is labeled repayable, not free savings", () => {
    const result = match({
      zip: "93906",
      household_size: 2,
      household_income: 72000,
      housing_status: "renter",
      homeowner: false,
      property_type: "single_family",
      interests: ["housing"],
    });

    const myHome = [...result.likelyEligible, ...result.possiblyEligible].find(
      (item) => item.slug === "calhfa-myhome",
    );
    expect(myHome).toBeDefined();
    expect(myHome?.valueKind).toBe("financing");
    expect(myHome?.valueText.toLowerCase()).toContain("financ");
    expect(
      visible.programs
        .filter((program) => isRepayableBenefit(program.benefit_type))
        .every((program) => program.benefit_type === "LOAN" || program.benefit_type === "FINANCING"),
    ).toBe(true);
  });
});
