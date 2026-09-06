import type {
  BenefitType,
  Confidence,
  LocationType,
  ProgramStatus,
  RelationshipType,
  RuleOperator,
} from "@/types/database";

export const CONSUMER_PROGRAM_STATUSES = [
  "ACTIVE",
  "WAITLIST",
  "PAUSED",
  "FUNDING_EXHAUSTED",
  "UPCOMING",
  "UNCERTAIN",
] as const satisfies readonly ProgramStatus[];

export const BENEFIT_TYPE_LABELS: Record<BenefitType, string> = {
  CASH: "Cash",
  REBATE: "Rebate",
  TAX_CREDIT: "Tax credit",
  BILL_SAVINGS: "Bill savings",
  FREE_SERVICE: "Free service",
  FREE_PRODUCT: "Free product",
  FORGIVABLE_LOAN: "Forgivable loan",
  LOAN: "Loan",
  FINANCING: "Financing",
  OTHER: "Other",
};

export const STATUS_LABELS: Record<ProgramStatus, string> = {
  ACTIVE: "Active",
  WAITLIST: "Waitlist",
  PAUSED: "Paused",
  FUNDING_EXHAUSTED: "Funding exhausted",
  UPCOMING: "Upcoming",
  EXPIRED: "Expired",
  UNCERTAIN: "Status uncertain",
};

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  STACKABLE: "May be combined with",
  CONDITIONALLY_STACKABLE: "May be combined in some cases with",
  MUTUALLY_EXCLUSIVE: "Cannot be combined with",
  UNKNOWN: "Related to",
  REQUIRES_SEQUENCE: "May need to be used in sequence with",
};

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  ELIGIBILITY: "Eligibility",
  BENEFIT: "Benefit",
  STATUS: "Status",
  APPLICATION: "Application",
  GEOGRAPHY: "Geography",
  STACKING: "Stacking",
  GENERAL: "General",
};

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  STATE: "State",
  COUNTY: "Counties",
  CITY: "Cities",
  ZIP: "ZIP codes",
  ELECTRIC_UTILITY: "Electric utilities",
  GAS_UTILITY: "Gas utilities",
};

export const FIELD_LABELS: Record<string, string> = {
  household_income: "Household income",
  household_size: "Household size",
  zip: "ZIP code",
  city: "City",
  county: "County",
  age: "Age",
  housing_status: "Housing status",
  homeowner: "Homeownership",
  property_type: "Home type",
  electric_utility: "Electric utility",
  gas_utility: "Gas utility",
  has_children: "Children in the household",
  veteran: "Veteran status",
  disability: "Disability or qualifying medical condition",
  owns_vehicle: "Vehicle ownership",
  owned_zev_before: "Prior zero-emission vehicle",
  first_ev: "First zero-emission vehicle",
  vehicle_condition: "Vehicle condition",
  vehicle_price: "Vehicle price",
  willing_to_retire_vehicle: "Willingness to retire a vehicle",
  home_improvement_interest: "Interest in home upgrades",
  interests: "Interests",
  owned_home: "Prior homeownership",
};

export const MONEY_FIELDS = new Set([
  "household_income",
  "vehicle_price",
]);

export function benefitTypeLabel(type: BenefitType): string {
  return BENEFIT_TYPE_LABELS[type];
}

export function statusLabel(status: ProgramStatus): string {
  return STATUS_LABELS[status];
}

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replaceAll("_", " ");
}

export function isRepayableBenefit(type: BenefitType): boolean {
  return type === "LOAN" || type === "FINANCING";
}

export const RULE_OPERATOR_LABELS: Record<RuleOperator, string> = {
  equals: "equals",
  not_equals: "does not equal",
  greater_than: "greater than",
  greater_than_or_equal: "at least",
  less_than: "less than",
  less_than_or_equal: "at most",
  in: "is one of",
  not_in: "is not one of",
  contains: "contains",
  is_true: "is yes",
  is_false: "is no",
  exists: "must be provided",
  not_exists: "must not be present",
};
