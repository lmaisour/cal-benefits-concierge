import type { ProgramRule } from "@/types/program";
import type { GeographyEvaluation, RuleResultStatus } from "@/lib/eligibility/types";

const FIELD_LABELS: Record<string, string> = {
  zip: "ZIP code",
  city: "city",
  county: "county",
  age: "age",
  household_size: "household size",
  household_income: "household income",
  housing_status: "housing status",
  property_type: "property type",
  homeowner: "homeownership",
  owned_home: "prior homeownership",
  electric_utility: "electric utility",
  gas_utility: "gas utility",
  has_children: "household children information",
  veteran: "veteran status",
  disability: "disability information",
  owns_vehicle: "vehicle ownership",
  first_ev: "first electric-vehicle status",
  owned_zev_before: "prior zero-emission vehicle ownership",
  vehicle_condition: "vehicle condition",
  vehicle_price: "vehicle price",
  willing_to_retire_vehicle: "willingness to retire a vehicle",
  home_improvement_interest: "interest in home improvements",
  interests: "listed interests",
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.split("_").join(" ");
}

function incomeFailMessage(operator: string): string {
  if (
    operator === "less_than" ||
    operator === "less_than_or_equal"
  ) {
    return "Your household income is above this program’s published limit.";
  }
  if (
    operator === "greater_than" ||
    operator === "greater_than_or_equal"
  ) {
    return "Your household income is below this program’s published minimum.";
  }
  return "Your household income does not appear to meet this requirement.";
}

/**
 * Consumer-facing rule copy. Labels stay machine-readable enums;
 * these sentences never claim official eligibility or “you qualify.”
 */
export function explainRule(
  rule: ProgramRule,
  status: RuleResultStatus,
): string {
  const label = fieldLabel(rule.field);

  if (rule.field === "household_income") {
    if (status === "PASS") {
      return "Your household income appears to meet this requirement.";
    }
    if (status === "UNKNOWN") {
      return "We need your household income to evaluate this requirement.";
    }
    return incomeFailMessage(rule.operator);
  }

  if (status === "PASS") {
    if (rule.operator === "exists") {
      return `Your ${label} appears to be on file for this requirement.`;
    }
    if (rule.operator === "not_exists") {
      return `This requirement looks at whether ${label} is on file, and it is not.`;
    }
    return `You appear to meet this ${label} requirement.`;
  }

  if (status === "UNKNOWN") {
    return `We need your ${label} to evaluate this requirement.`;
  }

  if (rule.operator === "exists") {
    return `This program needs ${label}, and it is not on your profile.`;
  }
  if (rule.operator === "not_exists") {
    return `This requirement expects ${label} not to be on file.`;
  }

  return `Your ${label} does not appear to meet this requirement.`;
}

export function explainGeography(evaluation: Omit<GeographyEvaluation, "explanation">): string {
  if (evaluation.status === "PASS") {
    const onlyState =
      evaluation.matchedLocations.length === 0 ||
      evaluation.matchedLocations.every((location) => location.location_type === "STATE");
    if (onlyState) {
      return "This program appears to be available statewide in California.";
    }
    return "Your location appears to match this program’s listed service area.";
  }

  if (evaluation.status === "FAIL") {
    return "Your location does not appear to match this program’s listed service area.";
  }

  const missing = evaluation.unknownTypes;
  if (missing.includes("ZIP") && missing.length === 1) {
    return "We need your ZIP code to evaluate this program’s location rules.";
  }
  if (missing.includes("ELECTRIC_UTILITY") && missing.length === 1) {
    return "We need your electric utility to evaluate this program’s location rules.";
  }
  if (missing.includes("GAS_UTILITY") && missing.length === 1) {
    return "We need your gas utility to evaluate this program’s location rules.";
  }
  if (missing.includes("COUNTY") && missing.length === 1) {
    return "We need your county to evaluate this program’s location rules.";
  }
  if (missing.includes("CITY") && missing.length === 1) {
    return "We need your city to evaluate this program’s location rules.";
  }
  return "We need more location information to evaluate this program’s service area.";
}
