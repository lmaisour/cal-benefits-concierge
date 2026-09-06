import { describe, expect, it } from "vitest";
import { ALL_INTEREST_VALUES } from "@/lib/questionnaire/interests";
import {
  applyHousingStatus,
  applyInterests,
  applyOptionalBoolean,
  applyOptionalNumber,
  applyOptionalString,
  applyZevOwnership,
} from "@/lib/questionnaire/profile";
import {
  BASE_STEP_IDS,
  VEHICLE_STEP_IDS,
  getProgress,
  getVisibleStepIds,
} from "@/lib/questionnaire/steps";
import {
  ageError,
  householdSizeError,
  incomeError,
  isValidZip,
  parseIntegerInRange,
  parseNonNegativeNumber,
  zipError,
} from "@/lib/questionnaire/validation";

describe("visible steps", () => {
  it("omits vehicle questions without vehicle interest", () => {
    expect(getVisibleStepIds({})).toEqual(BASE_STEP_IDS);
    expect(getVisibleStepIds({ interests: ["solar"] })).toHaveLength(12);
    expect(getVisibleStepIds({ interests: ["solar"] })).not.toContain(
      "owned_zev_before",
    );
  });

  it("includes vehicle questions when Vehicles / EVs is selected", () => {
    const steps = getVisibleStepIds({ interests: ["vehicles"] });
    expect(steps).toEqual([...BASE_STEP_IDS, ...VEHICLE_STEP_IDS]);
    expect(steps).toHaveLength(16);
  });

  it("includes vehicle questions when all categories are selected", () => {
    expect(getVisibleStepIds({ interests: [...ALL_INTEREST_VALUES] })).toEqual([
      ...BASE_STEP_IDS,
      ...VEHICLE_STEP_IDS,
    ]);
  });
});

describe("progress count", () => {
  it("uses the current path as the denominator", () => {
    expect(getProgress({}, "housing_status")).toEqual({
      current: 4,
      total: 12,
    });
    expect(getProgress({ interests: ["vehicles"] }, "owned_zev_before")).toEqual({
      current: 13,
      total: 16,
    });
    expect(getProgress({ interests: ["vehicles"] }, "interests")).toEqual({
      current: 12,
      total: 16,
    });
  });
});

describe("ZIP validation", () => {
  it("accepts a 5-digit ZIP and preserves leading zeros", () => {
    expect(isValidZip("02108")).toBe(true);
    expect(isValidZip("91331")).toBe(true);
    expect(zipError("02108")).toBeNull();
  });

  it("rejects incomplete or non-numeric ZIPs", () => {
    expect(isValidZip("9133")).toBe(false);
    expect(isValidZip("913311")).toBe(false);
    expect(isValidZip("91-31")).toBe(false);
    expect(zipError("")).toMatch(/5-digit/i);
  });
});

describe("numeric validation", () => {
  it("accepts household size 1–20 as an integer", () => {
    expect(parseIntegerInRange("1", 1, 20)).toBe(1);
    expect(parseIntegerInRange("20", 1, 20)).toBe(20);
    expect(parseIntegerInRange("0", 1, 20)).toBeUndefined();
    expect(parseIntegerInRange("21", 1, 20)).toBeUndefined();
    expect(parseIntegerInRange("3.5", 1, 20)).toBeUndefined();
    expect(householdSizeError("")).toBeTruthy();
  });

  it("accepts age 18–120 and income or price of 0 or more", () => {
    expect(parseIntegerInRange("18", 18, 120)).toBe(18);
    expect(parseIntegerInRange("17", 18, 120)).toBeUndefined();
    expect(parseNonNegativeNumber("0")).toBe(0);
    expect(parseNonNegativeNumber("50,000")).toBe(50000);
    expect(parseNonNegativeNumber("$7200.50")).toBe(7200.5);
    expect(parseNonNegativeNumber("-1")).toBeUndefined();
    expect(ageError("")).toBeNull();
    expect(incomeError("")).toBeNull();
  });
});

describe("derived fields", () => {
  it("derives homeowner from housing status", () => {
    expect(applyHousingStatus({}, "owner")).toMatchObject({
      housing_status: "owner",
      homeowner: true,
    });
    expect(applyHousingStatus({}, "renter").homeowner).toBe(false);
    expect(applyHousingStatus({}, "other").homeowner).toBe(false);
  });

  it("derives first_ev from ZEV ownership", () => {
    expect(applyZevOwnership({}, false)).toMatchObject({
      owned_zev_before: false,
      first_ev: true,
    });
    expect(applyZevOwnership({}, true)).toMatchObject({
      owned_zev_before: true,
      first_ev: false,
    });
  });

  it("derives home_improvement_interest from selected interests", () => {
    expect(applyInterests({}, ["solar"]).home_improvement_interest).toBe(true);
    expect(applyInterests({}, ["home-upgrades"]).home_improvement_interest).toBe(
      true,
    );
    expect(applyInterests({}, ["home-repairs"]).home_improvement_interest).toBe(
      true,
    );
    expect(applyInterests({}, ["vehicles"]).home_improvement_interest).toBeUndefined();
  });
});

describe("prefer not to say and not sure", () => {
  it("leaves optional fields undefined instead of using sentinels", () => {
    expect(
      applyOptionalNumber({ household_income: 50000 }, "household_income", undefined)
        .household_income,
    ).toBeUndefined();
    expect(
      applyOptionalNumber({ age: 40 }, "age", undefined).age,
    ).toBeUndefined();
    expect(
      applyOptionalBoolean({ has_children: true }, "has_children", undefined)
        .has_children,
    ).toBeUndefined();
    expect(
      applyOptionalBoolean({ veteran: false }, "veteran", undefined).veteran,
    ).toBeUndefined();
    expect(
      applyOptionalString({ electric_utility: "PG&E" }, "electric_utility", undefined)
        .electric_utility,
    ).toBeUndefined();
    expect(
      applyOptionalString({ vehicle_condition: "new" }, "vehicle_condition", undefined)
        .vehicle_condition,
    ).toBeUndefined();

    const clearedZev = applyZevOwnership(
      { owned_zev_before: true, first_ev: false },
      undefined,
    );
    expect(clearedZev.owned_zev_before).toBeUndefined();
    expect(clearedZev.first_ev).toBeUndefined();
  });
});
