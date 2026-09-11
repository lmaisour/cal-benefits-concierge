import { isCurrentlyAvailable } from "@/lib/content/currently-available";
import { formatLocationCoverageLines } from "@/lib/programs/format-location-coverage";
import {
  formatDate,
  formatProgramValue,
  formatRule,
} from "@/lib/programs/format";
import { benefitTypeLabel, statusLabel } from "@/lib/programs/labels";
import type { BenefitType, Json } from "@/types/database";
import type { Program, ProgramLocation, ProgramRule } from "@/types/program";

export type AtAGlanceItem = {
  label: string;
  value: string;
};

export const WHO_THIS_IS_FOR_LABEL = "Who this is for";

const INCOME_FIELDS = new Set(["household_income"]);
const HOMEOWNER_FIELDS = new Set(["homeowner", "housing_status"]);

const SEEKING_BY_BENEFIT: Record<BenefitType, string> = {
  CASH: "cash assistance",
  REBATE: "a rebate",
  TAX_CREDIT: "a tax credit",
  BILL_SAVINGS: "bill savings",
  FREE_SERVICE: "a free service",
  FREE_PRODUCT: "a free product",
  FORGIVABLE_LOAN: "a forgivable loan",
  LOAN: "a loan",
  FINANCING: "financing",
  OTHER: "this benefit",
};

const MAX_BENEFIT_PHRASE_CHARS = 48;
const MAX_BENEFIT_PHRASE_WORDS = 8;

function conciseBenefitPhrase(summary: string | null | undefined): string | null {
  if (!summary) {
    return null;
  }
  let text = summary.trim();
  if (!text || /[\n\r]/.test(text)) {
    return null;
  }
  text = text.replace(/[.]+$/g, "").trim();
  if (!text || /[.!?;:]/.test(text)) {
    return null;
  }
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > MAX_BENEFIT_PHRASE_WORDS) {
    return null;
  }
  if (text.length > MAX_BENEFIT_PHRASE_CHARS) {
    return null;
  }
  if (/^(this|the program|applicants?|eligible|you)\b/i.test(text)) {
    return null;
  }
  if (/^[A-Z][a-z]/.test(text)) {
    return text[0].toLowerCase() + text.slice(1);
  }
  return text;
}

function seekingPhrase(program: Program): string {
  return conciseBenefitPhrase(program.benefit_summary) ?? SEEKING_BY_BENEFIT[program.benefit_type];
}

function scalarText(value: Json | undefined): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim().toLowerCase();
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return null;
}

function uniqueNames(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value.trim());
  }
  return result;
}

function formatCountyName(name: string): string {
  const trimmed = name.trim();
  if (/ county$/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed} County`;
}

function cityAudienceName(name: string): string {
  const trimmed = name.trim();
  if (/^city of /i.test(trimmed)) {
    return trimmed;
  }
  return `City of ${trimmed}`;
}

function isDeterminateHousingStatusRule(rule: ProgramRule): boolean {
  const allowed = new Set(["owner", "renter"]);
  if (rule.operator === "equals") {
    const text = scalarText(rule.value);
    return text !== null && allowed.has(text);
  }
  if (rule.operator === "in" && Array.isArray(rule.value) && rule.value.length === 1) {
    const text = scalarText(rule.value[0]);
    return text !== null && allowed.has(text);
  }
  return false;
}

function isDeterminateHomeownerRule(rule: ProgramRule): boolean {
  if (!rule.required || !HOMEOWNER_FIELDS.has(rule.field)) {
    return false;
  }
  if (rule.field === "homeowner") {
    return (
      rule.operator === "is_true" ||
      rule.operator === "is_false" ||
      rule.operator === "equals" ||
      rule.operator === "not_equals"
    );
  }
  return isDeterminateHousingStatusRule(rule);
}

function uniqueRuleSummaries(rules: ProgramRule[]): string[] {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const rule of rules) {
    const text = formatRule(rule).trim();
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    values.push(text);
  }
  return values;
}

function requiredIncomeRules(rules: ProgramRule[]): ProgramRule[] {
  return rules.filter((rule) => rule.required && INCOME_FIELDS.has(rule.field));
}

function housingAudience(
  rules: ProgramRule[],
): "homeowners" | "renters" | null {
  const kinds = new Set<"homeowners" | "renters">();
  for (const rule of rules.filter(isDeterminateHomeownerRule)) {
    if (rule.field === "homeowner") {
      if (rule.operator === "is_true") {
        kinds.add("homeowners");
        continue;
      }
      if (rule.operator === "is_false") {
        kinds.add("renters");
        continue;
      }
      if (rule.operator === "equals") {
        const text = scalarText(rule.value);
        if (text === "true" || text === "yes") {
          kinds.add("homeowners");
        } else if (text === "false" || text === "no") {
          kinds.add("renters");
        }
        continue;
      }
      continue;
    }
    const value =
      rule.operator === "in" && Array.isArray(rule.value)
        ? scalarText(rule.value[0])
        : scalarText(rule.value);
    if (value === "owner") {
      kinds.add("homeowners");
    } else if (value === "renter") {
      kinds.add("renters");
    }
  }
  if (kinds.size === 1) {
    return [...kinds][0];
  }
  return null;
}

type PlaceAudience =
  | { kind: "area"; text: string }
  | { kind: "zip"; text: string }
  | { kind: "utility"; text: string };

function placeAudience(
  program: Program,
  locations: ProgramLocation[],
): PlaceAudience | null {
  if (program.statewide) {
    return { kind: "area", text: "California" };
  }

  const cities = uniqueNames(
    locations.filter((row) => row.location_type === "CITY").map((row) => row.location_value),
  );
  const counties = uniqueNames(
    locations.filter((row) => row.location_type === "COUNTY").map((row) => row.location_value),
  );
  const zips = uniqueNames(
    locations.filter((row) => row.location_type === "ZIP").map((row) => row.location_value),
  );
  const utilities = uniqueNames(
    locations
      .filter(
        (row) =>
          row.location_type === "ELECTRIC_UTILITY" || row.location_type === "GAS_UTILITY",
      )
      .map((row) => row.location_value),
  );

  if (cities.length === 1 && counties.length === 0 && zips.length === 0 && utilities.length === 0) {
    return { kind: "area", text: cityAudienceName(cities[0]) };
  }
  if (cities.length === 2 && counties.length === 0 && zips.length === 0 && utilities.length === 0) {
    return {
      kind: "area",
      text: `${cityAudienceName(cities[0])} and ${cityAudienceName(cities[1])}`,
    };
  }
  if (counties.length === 1 && cities.length === 0 && zips.length === 0 && utilities.length === 0) {
    return { kind: "area", text: formatCountyName(counties[0]) };
  }
  if (zips.length === 1 && cities.length === 0 && counties.length === 0 && utilities.length === 0) {
    return { kind: "zip", text: zips[0].replace(/\D/g, "").slice(0, 5) };
  }
  if (utilities.length === 1 && cities.length === 0 && counties.length === 0 && zips.length === 0) {
    return { kind: "utility", text: utilities[0] };
  }
  return null;
}

function capitalizeSentence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

function whoThisIsFor(input: {
  program: Program;
  rules: ProgramRule[];
  locations: ProgramLocation[];
}): string | null {
  if (!isCurrentlyAvailable(input.program)) {
    return null;
  }

  const place = placeAudience(input.program, input.locations);
  const housing = housingAudience(input.rules);
  const hasIncome = requiredIncomeRules(input.rules).length > 0;
  const seeking = seekingPhrase(input.program);

  if (!place && !housing && !hasIncome) {
    return null;
  }

  let audience: string | null = null;
  if (place?.kind === "utility") {
    audience = housing
      ? `eligible ${place.text} ${housing}`
      : `eligible ${place.text} customers`;
  } else if (place?.kind === "zip") {
    audience = housing
      ? `${housing} in ZIP ${place.text}`
      : `residents in ZIP ${place.text}`;
  } else if (place?.kind === "area") {
    audience = housing ? `${place.text} ${housing}` : `${place.text} residents`;
  } else if (housing) {
    audience = housing;
  } else if (hasIncome) {
    audience = "people";
  }

  if (!audience || !seeking) {
    return null;
  }

  let sentence = `${audience} looking for ${seeking}`;
  if (hasIncome) {
    sentence += " who meet published income limits";
  }
  return `${capitalizeSentence(sentence)}.`;
}

function benefitValue(program: Program): string {
  const formatted = formatProgramValue(program);
  if (formatted.text.trim()) {
    return formatted.text.trim();
  }
  if (program.benefit_summary?.trim()) {
    return program.benefit_summary.trim();
  }
  return benefitTypeLabel(program.benefit_type);
}

export function atAGlanceItems(input: {
  program: Program;
  rules: ProgramRule[];
  locations: ProgramLocation[];
}): AtAGlanceItem[] {
  const items: AtAGlanceItem[] = [];
  const who = whoThisIsFor(input);
  if (who) {
    items.push({ label: WHO_THIS_IS_FOR_LABEL, value: who });
  }

  const benefit = benefitValue(input.program);
  if (benefit) {
    items.push({ label: "Benefit", value: benefit });
  }

  items.push({ label: "Current status", value: statusLabel(input.program.status) });

  const serviceArea = formatLocationCoverageLines(
    input.program.statewide,
    input.locations,
  ).join("; ");
  if (serviceArea) {
    items.push({ label: "Service area", value: serviceArea });
  }

  if (input.program.administrator?.trim()) {
    items.push({
      label: "Administrator",
      value: input.program.administrator.trim(),
    });
  }

  const incomeSummaries = uniqueRuleSummaries(requiredIncomeRules(input.rules));
  if (incomeSummaries.length > 0) {
    items.push({ label: "Income", value: incomeSummaries.join(" ") });
  }

  const homeownerSummaries = uniqueRuleSummaries(
    input.rules.filter(isDeterminateHomeownerRule),
  );
  if (homeownerSummaries.length > 0) {
    items.push({ label: "Homeownership", value: homeownerSummaries.join(" ") });
  }

  const verified = formatDate(input.program.last_verified_at);
  if (verified) {
    items.push({ label: "Last verified", value: verified });
  }

  return items;
}
