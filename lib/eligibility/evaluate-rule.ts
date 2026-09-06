import { explainRule } from "@/lib/eligibility/explanations";
import type {
  RuleEvaluation,
  RuleResultStatus,
  UserProfile,
} from "@/lib/eligibility/types";
import {
  asNumber,
  asUnknownArray,
  getProfileValue,
  isMissing,
  isPlainObject,
  normalizeString,
  valuesEqual,
} from "@/lib/eligibility/values";
import type { ProgramRule, RuleOperator } from "@/types/program";

/**
 * Deterministic rule evaluation. No scoring, probabilities, or AI.
 *
 * `contains` behavior (documented, deterministic):
 * - profile string contains rule string (trim + case-insensitive)
 * - profile string contains any string from a rule array
 * - profile array contains a rule scalar (same equality as `equals`)
 * - profile array intersects a rule array (any shared element)
 *
 * Missing profile values are UNKNOWN for operators that need a value.
 * Exceptions: `exists` + missing → FAIL; `not_exists` + missing → PASS.
 * Malformed rule values return UNKNOWN instead of throwing.
 */
export function evaluateRule(
  rule: ProgramRule,
  profile: UserProfile,
): RuleEvaluation {
  try {
    const status = evaluateRuleStatus(rule, profile);
    return {
      rule,
      status,
      explanation: explainRule(rule, status),
    };
  } catch {
    return {
      rule,
      status: "UNKNOWN",
      explanation: explainRule(rule, "UNKNOWN"),
    };
  }
}

function evaluateRuleStatus(
  rule: ProgramRule,
  profile: UserProfile,
): RuleResultStatus {
  const operator = rule.operator as string;
  const profileValue = getProfileValue(profile, rule.field);
  const missing = isMissing(profileValue);

  switch (operator as RuleOperator) {
    case "exists":
      return missing ? "FAIL" : "PASS";
    case "not_exists":
      return missing ? "PASS" : "FAIL";
    case "is_true":
      return evaluateBoolean(profileValue, true, missing);
    case "is_false":
      return evaluateBoolean(profileValue, false, missing);
    case "equals":
      return evaluateEquals(profileValue, rule.value, missing);
    case "not_equals":
      return invertComparable(evaluateEquals(profileValue, rule.value, missing));
    case "greater_than":
    case "greater_than_or_equal":
    case "less_than":
    case "less_than_or_equal":
      return evaluateComparison(operator, profileValue, rule.value, missing);
    case "in":
      return evaluateMembership(profileValue, rule.value, missing, false);
    case "not_in":
      return evaluateMembership(profileValue, rule.value, missing, true);
    case "contains":
      return evaluateContains(profileValue, rule.value, missing);
    default:
      return "UNKNOWN";
  }
}

function evaluateBoolean(
  profileValue: unknown,
  expected: boolean,
  missing: boolean,
): RuleResultStatus {
  if (missing) {
    return "UNKNOWN";
  }
  if (typeof profileValue !== "boolean") {
    return "UNKNOWN";
  }
  return profileValue === expected ? "PASS" : "FAIL";
}

function evaluateEquals(
  profileValue: unknown,
  ruleValue: unknown,
  missing: boolean,
): RuleResultStatus {
  if (missing) {
    return "UNKNOWN";
  }
  if (isMissing(ruleValue) || isPlainObject(ruleValue)) {
    return "UNKNOWN";
  }
  const equal = valuesEqual(profileValue, ruleValue);
  if (equal === undefined) {
    return "UNKNOWN";
  }
  return equal ? "PASS" : "FAIL";
}

function invertComparable(status: RuleResultStatus): RuleResultStatus {
  if (status === "PASS") {
    return "FAIL";
  }
  if (status === "FAIL") {
    return "PASS";
  }
  return "UNKNOWN";
}

function evaluateComparison(
  operator: string,
  profileValue: unknown,
  ruleValue: unknown,
  missing: boolean,
): RuleResultStatus {
  if (missing) {
    return "UNKNOWN";
  }
  const left = asNumber(profileValue);
  const right = asNumber(ruleValue);
  if (left === undefined || right === undefined) {
    return "UNKNOWN";
  }

  let passed = false;
  switch (operator) {
    case "greater_than":
      passed = left > right;
      break;
    case "greater_than_or_equal":
      passed = left >= right;
      break;
    case "less_than":
      passed = left < right;
      break;
    case "less_than_or_equal":
      passed = left <= right;
      break;
    default:
      return "UNKNOWN";
  }
  return passed ? "PASS" : "FAIL";
}

function evaluateMembership(
  profileValue: unknown,
  ruleValue: unknown,
  missing: boolean,
  negate: boolean,
): RuleResultStatus {
  if (missing) {
    return "UNKNOWN";
  }
  const options = asUnknownArray(ruleValue);
  if (!options) {
    return "UNKNOWN";
  }

  let sawComparable = false;
  for (const option of options) {
    if (isPlainObject(option)) {
      continue;
    }
    const equal = valuesEqual(profileValue, option);
    if (equal === undefined) {
      continue;
    }
    sawComparable = true;
    if (equal) {
      return negate ? "FAIL" : "PASS";
    }
  }

  if (!sawComparable) {
    return "UNKNOWN";
  }
  return negate ? "PASS" : "FAIL";
}

function evaluateContains(
  profileValue: unknown,
  ruleValue: unknown,
  missing: boolean,
): RuleResultStatus {
  if (missing) {
    return "UNKNOWN";
  }
  if (isMissing(ruleValue)) {
    return "UNKNOWN";
  }

  if (typeof profileValue === "string") {
    if (typeof ruleValue === "string") {
      return stringContains(profileValue, ruleValue) ? "PASS" : "FAIL";
    }
    const options = asUnknownArray(ruleValue);
    if (!options) {
      return "UNKNOWN";
    }
    const needles = options.filter((item): item is string => typeof item === "string");
    if (needles.length === 0) {
      return "UNKNOWN";
    }
    return needles.some((needle) => stringContains(profileValue, needle))
      ? "PASS"
      : "FAIL";
  }

  const haystack = asUnknownArray(profileValue);
  if (!haystack) {
    return "UNKNOWN";
  }

  const needles = asUnknownArray(ruleValue) ?? [ruleValue];
  let sawComparable = false;
  for (const needle of needles) {
    if (isPlainObject(needle)) {
      continue;
    }
    for (const item of haystack) {
      const equal = valuesEqual(item, needle);
      if (equal === undefined) {
        continue;
      }
      sawComparable = true;
      if (equal) {
        return "PASS";
      }
    }
    if (typeof needle === "string") {
      for (const item of haystack) {
        if (typeof item === "string") {
          sawComparable = true;
          if (stringContains(item, needle)) {
            return "PASS";
          }
        }
      }
    }
  }

  if (!sawComparable) {
    return "UNKNOWN";
  }
  return "FAIL";
}

function stringContains(haystack: string, needle: string): boolean {
  if (needle.trim() === "") {
    return false;
  }
  return normalizeString(haystack).includes(normalizeString(needle));
}
