/**
 * Interest tokens stored on `UserProfile.interests`.
 *
 * “Everything” is a UI control only. Selecting it stores every category
 * below — never a separate `"everything"` token — so later ranking can
 * treat the list as concrete topics.
 *
 * These values do not restrict matching in Milestone 6 unless that is
 * requested later.
 */
export const INTEREST_OPTIONS = [
  { value: "vehicles", label: "Vehicles / EVs" },
  { value: "home-upgrades", label: "Home upgrades" },
  { value: "solar", label: "Solar / battery" },
  { value: "utility-bills", label: "Utility bills" },
  { value: "water", label: "Water / landscaping" },
  { value: "buying-a-home", label: "Buying a home" },
  { value: "home-repairs", label: "Home repairs" },
  { value: "family-benefits", label: "Family benefits" },
  { value: "tax-credits", label: "Tax credits" },
] as const;

export type InterestValue = (typeof INTEREST_OPTIONS)[number]["value"];

export const ALL_INTEREST_VALUES: InterestValue[] = INTEREST_OPTIONS.map(
  (option) => option.value,
);

export const VEHICLE_INTEREST = "vehicles" as const;

export const HOME_IMPROVEMENT_INTERESTS: readonly InterestValue[] = [
  "home-upgrades",
  "solar",
  "home-repairs",
];

export const INTEREST_LABELS: Record<InterestValue, string> = Object.fromEntries(
  INTEREST_OPTIONS.map((option) => [option.value, option.label]),
) as Record<InterestValue, string>;

export function isInterestValue(value: string): value is InterestValue {
  return ALL_INTEREST_VALUES.includes(value as InterestValue);
}

export function hasVehicleInterest(interests: string[] | undefined): boolean {
  return interests?.includes(VEHICLE_INTEREST) ?? false;
}

export function interestsIndicateHomeImprovement(
  interests: string[] | undefined,
): boolean {
  return (
    interests?.some((interest) =>
      HOME_IMPROVEMENT_INTERESTS.includes(interest as InterestValue),
    ) ?? false
  );
}

export function allInterestsSelected(interests: string[] | undefined): boolean {
  if (!interests) {
    return false;
  }
  return ALL_INTEREST_VALUES.every((value) => interests.includes(value));
}
