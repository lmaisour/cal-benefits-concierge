import type { UserProfile } from "@/lib/eligibility/types";
import type {
  BenefitType,
  Program,
  ProgramLocation,
  ProgramRule,
  ProgramStatus,
} from "@/types/program";

let ruleId = 1;
let locationId = 1;

export function makeProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: "program-test",
    name: "Test program",
    slug: "test-program",
    administrator: "Sample administrator",
    category: "home-energy",
    subcategory: null,
    short_description: "Test fixture",
    description: "SAMPLE fixture — not a real benefit.",
    benefit_summary: "Test benefit",
    benefit_type: "REBATE" as BenefitType,
    benefit_min: 100,
    benefit_max: 500,
    benefit_period: "one_time",
    status: "ACTIVE" as ProgramStatus,
    official_url: "https://example.invalid/test",
    application_url: "https://example.invalid/test/apply",
    statewide: true,
    preapproval_required: false,
    purchase_before_approval_allowed: true,
    effective_start: "2024-01-01",
    effective_end: null,
    last_verified_at: "2026-08-01T00:00:00Z",
    confidence: "MEDIUM",
    featured: false,
    active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeRule(
  overrides: Partial<ProgramRule> &
    Pick<ProgramRule, "program_id" | "field" | "operator">,
): ProgramRule {
  ruleId += 1;
  return {
    id: `rule-${ruleId}`,
    value: null,
    rule_group: 1,
    group_operator: "AND",
    required: true,
    explanation: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeLocation(
  overrides: Partial<ProgramLocation> &
    Pick<ProgramLocation, "program_id" | "location_type" | "location_value">,
): ProgramLocation {
  locationId += 1;
  return {
    id: `loc-${locationId}`,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function statewideLocations(programId: string): ProgramLocation[] {
  return [
    makeLocation({
      program_id: programId,
      location_type: "STATE",
      location_value: "CA",
    }),
  ];
}

export const EV_PROGRAM_ID = "11111111-1111-4111-8111-111111111111";
export const WEATHERIZATION_PROGRAM_ID =
  "77777777-7777-4777-8777-777777777777";

export const valleyFirstEvProgram = makeProgram({
  id: EV_PROGRAM_ID,
  name: "SAMPLE: Valley First EV Rebate",
  slug: "sample-valley-first-ev-rebate",
  administrator: "Sample California Air District",
  category: "vehicles",
  subcategory: "electric-vehicles",
  benefit_type: "REBATE",
  benefit_min: 1500,
  benefit_max: 3500,
  statewide: false,
  preapproval_required: true,
  purchase_before_approval_allowed: false,
});

export const valleyFirstEvRules: ProgramRule[] = [
  makeRule({
    program_id: EV_PROGRAM_ID,
    field: "household_income",
    operator: "less_than_or_equal",
    value: 80000,
    explanation: "Household income must be at or below the sample threshold.",
  }),
  makeRule({
    program_id: EV_PROGRAM_ID,
    field: "first_ev",
    operator: "is_true",
    value: true,
    explanation: "Applicant must not have owned a ZEV before.",
  }),
  makeRule({
    program_id: EV_PROGRAM_ID,
    field: "vehicle_price",
    operator: "less_than_or_equal",
    value: 45000,
    explanation: "Vehicle purchase price must be at or below $45,000.",
  }),
  makeRule({
    program_id: EV_PROGRAM_ID,
    field: "zip",
    operator: "in",
    value: ["91331", "90012", "93722"],
    explanation: "Must live in a participating sample ZIP code.",
  }),
  makeRule({
    program_id: EV_PROGRAM_ID,
    field: "vehicle_condition",
    operator: "equals",
    value: "new",
    required: false,
    explanation: "This sample rebate is designed around a new vehicle.",
  }),
];

export const valleyFirstEvLocations: ProgramLocation[] = [
  makeLocation({
    program_id: EV_PROGRAM_ID,
    location_type: "STATE",
    location_value: "CA",
  }),
  makeLocation({
    program_id: EV_PROGRAM_ID,
    location_type: "ZIP",
    location_value: "91331",
  }),
  makeLocation({
    program_id: EV_PROGRAM_ID,
    location_type: "ZIP",
    location_value: "90012",
  }),
  makeLocation({
    program_id: EV_PROGRAM_ID,
    location_type: "ZIP",
    location_value: "93722",
  }),
];

export const weatherizationProgram = makeProgram({
  id: WEATHERIZATION_PROGRAM_ID,
  name: "SAMPLE: Warm Walls Weatherization",
  slug: "sample-warm-walls-weatherization",
  administrator: "Sample Community Energy Agency",
  category: "home-energy",
  subcategory: "weatherization",
  benefit_type: "FREE_SERVICE",
  statewide: false,
});

export const weatherizationRules: ProgramRule[] = [
  makeRule({
    program_id: WEATHERIZATION_PROGRAM_ID,
    field: "household_income",
    operator: "less_than_or_equal",
    value: 50000,
    rule_group: 1,
    group_operator: "AND",
    explanation: "Income must be at or below the sample weatherization limit.",
  }),
  makeRule({
    program_id: WEATHERIZATION_PROGRAM_ID,
    field: "property_type",
    operator: "not_equals",
    value: "multifamily",
    rule_group: 1,
    group_operator: "AND",
    required: false,
    explanation: "Large multifamily buildings are out of scope for this sample.",
  }),
  makeRule({
    program_id: WEATHERIZATION_PROGRAM_ID,
    field: "housing_status",
    operator: "equals",
    value: "owner",
    rule_group: 2,
    group_operator: "OR",
    explanation: "Owners may apply.",
  }),
  makeRule({
    program_id: WEATHERIZATION_PROGRAM_ID,
    field: "housing_status",
    operator: "equals",
    value: "renter",
    rule_group: 2,
    group_operator: "OR",
    explanation: "Renters may apply with landlord approval in this sample.",
  }),
  makeRule({
    program_id: WEATHERIZATION_PROGRAM_ID,
    field: "gas_utility",
    operator: "in",
    value: ["SoCalGas", "PG&E", "SDG&E"],
    rule_group: 1,
    group_operator: "AND",
    required: false,
    explanation: "Known gas utilities help route the sample service.",
  }),
];

export const weatherizationLocations: ProgramLocation[] = [
  makeLocation({
    program_id: WEATHERIZATION_PROGRAM_ID,
    location_type: "STATE",
    location_value: "CA",
  }),
  makeLocation({
    program_id: WEATHERIZATION_PROGRAM_ID,
    location_type: "GAS_UTILITY",
    location_value: "SoCalGas",
  }),
  makeLocation({
    program_id: WEATHERIZATION_PROGRAM_ID,
    location_type: "GAS_UTILITY",
    location_value: "PG&E",
  }),
  makeLocation({
    program_id: WEATHERIZATION_PROGRAM_ID,
    location_type: "GAS_UTILITY",
    location_value: "SDG&E",
  }),
];

export const matchingEvProfile: UserProfile = {
  zip: "91331",
  household_income: 75000,
  first_ev: true,
  vehicle_price: 32000,
  vehicle_condition: "new",
};

export const matchingWeatherizationProfile: UserProfile = {
  household_income: 42000,
  housing_status: "renter",
  property_type: "single_family",
  gas_utility: "SoCalGas",
};

