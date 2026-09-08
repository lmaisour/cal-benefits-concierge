import type { UserProfile } from "@/lib/eligibility/types";
import { isInterestValue } from "@/lib/questionnaire/interests";
import { isValidZip } from "@/lib/questionnaire/validation";

const HOUSING_STATUSES = ["owner", "renter", "other"] as const;
const PROPERTY_TYPES = [
  "single_family",
  "condo",
  "townhome",
  "multifamily",
  "apartment",
  "mobile_home",
  "other",
] as const;
const VEHICLE_CONDITIONS = ["new", "used"] as const;
const HOME_IMPROVEMENT_INTERESTS = ["home-upgrades", "solar", "home-repairs"];

const BOOLEAN_FIELDS = [
  "owned_home",
  "has_children",
  "veteran",
  "disability",
  "owns_vehicle",
  "owned_zev_before",
  "willing_to_retire_vehicle",
] as const;

const STRING_FIELDS = [
  "city",
  "county",
  "electric_utility",
  "gas_utility",
] as const;

export type ProfileValidationSuccess = {
  ok: true;
  profile: UserProfile;
};

export type ProfileValidationFailure = {
  ok: false;
  error: string;
};

export type ProfileValidationResult =
  | ProfileValidationSuccess
  | ProfileValidationFailure;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function readOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Runtime sanitizer for questionnaire JSON. Unknown fields are ignored.
 * Required match fields (ZIP, household size, housing status, property type)
 * must be present and valid. Invalid optional fields are dropped, not coerced.
 * Derived eligibility fields are recomputed from sanitized authoritative answers.
 */
export function validateUserProfile(input: unknown): ProfileValidationResult {
  if (!isPlainObject(input)) {
    return { ok: false, error: "A profile object is required." };
  }

  const profile: UserProfile = {};

  const zip = input.zip;
  if (typeof zip !== "string" || !isValidZip(zip)) {
    return {
      ok: false,
      error: "A valid 5-digit ZIP code is required.",
    };
  }
  profile.zip = zip.trim();

  if (!isIntegerInRange(input.household_size, 1, 20)) {
    return {
      ok: false,
      error: "Household size must be a whole number from 1 to 20.",
    };
  }
  profile.household_size = input.household_size;

  if (
    typeof input.housing_status !== "string" ||
    !HOUSING_STATUSES.includes(
      input.housing_status as (typeof HOUSING_STATUSES)[number],
    )
  ) {
    return { ok: false, error: "Housing status is required." };
  }
  profile.housing_status = input.housing_status as UserProfile["housing_status"];
  profile.homeowner = profile.housing_status === "owner";

  if (
    typeof input.property_type !== "string" ||
    !PROPERTY_TYPES.includes(
      input.property_type as (typeof PROPERTY_TYPES)[number],
    )
  ) {
    return { ok: false, error: "Property type is required." };
  }
  profile.property_type = input.property_type as UserProfile["property_type"];

  if (input.age !== undefined) {
    if (isIntegerInRange(input.age, 18, 120)) {
      profile.age = input.age;
    }
  }

  if (input.household_income !== undefined) {
    if (isNonNegativeNumber(input.household_income)) {
      profile.household_income = input.household_income;
    }
  }

  if (input.vehicle_price !== undefined) {
    if (isNonNegativeNumber(input.vehicle_price)) {
      profile.vehicle_price = input.vehicle_price;
    }
  }

  if (input.vehicle_condition !== undefined) {
    if (
      typeof input.vehicle_condition === "string" &&
      VEHICLE_CONDITIONS.includes(
        input.vehicle_condition as (typeof VEHICLE_CONDITIONS)[number],
      )
    ) {
      profile.vehicle_condition = input.vehicle_condition as "new" | "used";
    }
  }

  for (const field of STRING_FIELDS) {
    if (!(field in input)) {
      continue;
    }
    const value = readOptionalString(input[field]);
    if (value !== undefined) {
      profile[field] = value;
    }
  }

  for (const field of BOOLEAN_FIELDS) {
    if (!(field in input)) {
      continue;
    }
    const value = input[field];
    if (typeof value === "boolean") {
      profile[field] = value;
    }
  }

  if (typeof profile.owned_zev_before === "boolean") {
    profile.first_ev = !profile.owned_zev_before;
  }

  if (input.interests !== undefined) {
    if (Array.isArray(input.interests)) {
      const interests: string[] = [];
      for (const item of input.interests) {
        if (typeof item !== "string") {
          continue;
        }
        const trimmed = item.trim();
        if (isInterestValue(trimmed) && !interests.includes(trimmed)) {
          interests.push(trimmed);
        }
      }
      if (interests.length > 0) {
        profile.interests = interests;
      }
    }
  }

  if (
    profile.interests?.some((interest) =>
      HOME_IMPROVEMENT_INTERESTS.includes(interest),
    )
  ) {
    profile.home_improvement_interest = true;
  }

  return { ok: true, profile };
}

export function isCompleteMatchProfile(profile: UserProfile): boolean {
  return validateUserProfile(profile).ok;
}
