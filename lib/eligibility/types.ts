import type {
  LocationType,
  Program,
  ProgramLocation,
  ProgramRule,
  RuleGroupOperator,
} from "@/types/program";

/**
 * Answers a resident can provide. Every field is optional.
 * Missing values stay missing — never coerced to false, 0, or "".
 */
export type UserProfile = {
  zip?: string;
  city?: string;
  county?: string;

  age?: number;
  household_size?: number;
  household_income?: number;

  housing_status?: "owner" | "renter" | "other";

  property_type?:
    | "single_family"
    | "condo"
    | "townhome"
    | "multifamily"
    | "apartment"
    | "mobile_home"
    | "other";

  homeowner?: boolean;
  owned_home?: boolean;

  electric_utility?: string;
  gas_utility?: string;

  has_children?: boolean;
  veteran?: boolean;
  disability?: boolean;

  owns_vehicle?: boolean;
  first_ev?: boolean;
  owned_zev_before?: boolean;

  vehicle_condition?: "new" | "used";
  vehicle_price?: number;
  willing_to_retire_vehicle?: boolean;

  home_improvement_interest?: boolean;

  interests?: string[];
};

export const USER_PROFILE_FIELDS = [
  "zip",
  "city",
  "county",
  "age",
  "household_size",
  "household_income",
  "housing_status",
  "property_type",
  "homeowner",
  "owned_home",
  "electric_utility",
  "gas_utility",
  "has_children",
  "veteran",
  "disability",
  "owns_vehicle",
  "first_ev",
  "owned_zev_before",
  "vehicle_condition",
  "vehicle_price",
  "willing_to_retire_vehicle",
  "home_improvement_interest",
  "interests",
] as const;

export type UserProfileField = (typeof USER_PROFILE_FIELDS)[number];

export type RuleResultStatus = "PASS" | "FAIL" | "UNKNOWN";

export type RuleEvaluation = {
  rule: ProgramRule;
  status: RuleResultStatus;
  explanation: string;
};

export type ProgramEligibilityStatus =
  | "LIKELY_ELIGIBLE"
  | "POSSIBLY_ELIGIBLE"
  | "NOT_ELIGIBLE";

export type RuleGroupEvaluation = {
  ruleGroup: number;
  operator: RuleGroupOperator;
  required: boolean;
  status: RuleResultStatus;
  ruleResults: RuleEvaluation[];
};

export type GeographyEvaluation = {
  status: RuleResultStatus;
  explanation: string;
  /** Location rows that matched the profile. */
  matchedLocations: ProgramLocation[];
  /** Restrictive location types that were present on the program and known-conflicted. */
  conflictingTypes: LocationType[];
  /** Restrictive location types that could not be evaluated because the profile value is missing. */
  unknownTypes: LocationType[];
};

export type ProgramEvaluation = {
  program: Program;
  status: ProgramEligibilityStatus;
  ruleResults: RuleEvaluation[];
  failedRequiredRules: RuleEvaluation[];
  unknownRequiredRules: RuleEvaluation[];
  passedRequiredRules: RuleEvaluation[];
  requiredGroups: RuleGroupEvaluation[];
  optionalRuleResults: RuleEvaluation[];
  geography: GeographyEvaluation;
  hasUnmodeledRequiredCriteria: boolean;
  unmodeledRequiredCriteriaSummary: string | null;
};

export type MatchProgramsResult = {
  likelyEligible: ProgramEvaluation[];
  possiblyEligible: ProgramEvaluation[];
  notEligible: ProgramEvaluation[];
};

export type { Program, ProgramLocation, ProgramRule, RuleGroupOperator };
