import type { UserProfile } from "@/lib/eligibility/types";
import {
  hasVehicleInterest,
  interestsIndicateHomeImprovement,
} from "@/lib/questionnaire/interests";

export const HOUSING_STATUS_LABELS = {
  owner: "Own",
  renter: "Rent",
  other: "Other",
} as const;

export const PROPERTY_TYPE_LABELS = {
  single_family: "Single-family home",
  condo: "Condo",
  townhome: "Townhome",
  apartment: "Apartment",
  multifamily: "Multifamily property",
  mobile_home: "Mobile/manufactured home",
  other: "Other",
} as const;

export function unsetField(
  profile: UserProfile,
  field: keyof UserProfile,
): UserProfile {
  const next = { ...profile };
  delete next[field];
  return next;
}

export function applyHousingStatus(
  profile: UserProfile,
  status: NonNullable<UserProfile["housing_status"]>,
): UserProfile {
  return {
    ...profile,
    housing_status: status,
    homeowner: status === "owner",
  };
}

/**
 * Not sure / prefer not to say clears both the asked field and the
 * implied `first_ev` flag so a previous Yes/No is not left behind.
 */
export function applyZevOwnership(
  profile: UserProfile,
  ownedZevBefore: boolean | undefined,
): UserProfile {
  const next = { ...profile };
  if (ownedZevBefore === undefined) {
    delete next.owned_zev_before;
    delete next.first_ev;
    return next;
  }
  next.owned_zev_before = ownedZevBefore;
  next.first_ev = !ownedZevBefore;
  return next;
}

export function applyOptionalBoolean(
  profile: UserProfile,
  field: "has_children" | "veteran" | "disability" | "willing_to_retire_vehicle",
  value: boolean | undefined,
): UserProfile {
  const next = { ...profile };
  if (value === undefined) {
    delete next[field];
    return next;
  }
  next[field] = value;
  return next;
}

export function applyInterests(
  profile: UserProfile,
  interests: string[] | undefined,
): UserProfile {
  const next = { ...profile };
  if (!interests || interests.length === 0) {
    delete next.interests;
    delete next.home_improvement_interest;
    return next;
  }

  next.interests = interests;
  if (interestsIndicateHomeImprovement(interests)) {
    next.home_improvement_interest = true;
  } else {
    delete next.home_improvement_interest;
  }
  return next;
}

export function applyOptionalString<
  K extends "electric_utility" | "gas_utility" | "vehicle_condition",
>(profile: UserProfile, field: K, value: UserProfile[K] | undefined): UserProfile {
  const next = { ...profile };
  if (value === undefined || value === "") {
    delete next[field];
    return next;
  }
  next[field] = value;
  return next;
}

export function applyOptionalNumber(
  profile: UserProfile,
  field: "household_income" | "age" | "vehicle_price" | "household_size",
  value: number | undefined,
): UserProfile {
  const next = { ...profile };
  if (value === undefined) {
    delete next[field];
    return next;
  }
  next[field] = value;
  return next;
}

export function applyZip(profile: UserProfile, zip: string): UserProfile {
  return { ...profile, zip };
}

export { hasVehicleInterest };
