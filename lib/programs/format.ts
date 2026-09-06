import { programCategories } from "@/lib/config/categories";
import type { Json } from "@/types/database";
import type { Program, ProgramRule } from "@/types/program";
import { isSavingsBenefitType } from "@/types/program";
import { MONEY_FIELDS, fieldLabel, isRepayableBenefit } from "@/lib/programs/labels";

export function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatDate(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export type ProgramValueDisplay = {
  kind: "savings" | "financing" | "none";
  text: string;
};

export function formatProgramValue(program: Program): ProgramValueDisplay {
  const max = toNumber(program.benefit_max);
  const min = toNumber(program.benefit_min);

  if (isRepayableBenefit(program.benefit_type)) {
    if (max !== null && min !== null && min !== max) {
      return {
        kind: "financing",
        text: `Financing ${formatUsd(min)} to ${formatUsd(max)}`,
      };
    }
    if (max !== null) {
      return { kind: "financing", text: `Financing up to ${formatUsd(max)}` };
    }
    if (min !== null) {
      return { kind: "financing", text: `Financing from ${formatUsd(min)}` };
    }
    return { kind: "financing", text: "Repayable financing" };
  }

  if (!isSavingsBenefitType(program.benefit_type)) {
    return { kind: "none", text: "" };
  }

  if (max !== null) {
    return { kind: "savings", text: `Up to ${formatUsd(max)}` };
  }
  if (min !== null) {
    return { kind: "savings", text: `From ${formatUsd(min)}` };
  }
  return { kind: "none", text: "" };
}

function formatScalar(value: Json, asMoney: boolean): string {
  if (typeof value === "number") {
    return asMoney ? formatUsd(value) : String(value);
  }
  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    if (asMoney && value !== "" && Number.isFinite(numeric)) {
      return formatUsd(numeric);
    }
    return value.replaceAll("_", " ");
  }
  if (value === null) {
    return "";
  }
  return JSON.stringify(value);
}

function formatRuleValue(value: Json, field: string): string {
  const asMoney = MONEY_FIELDS.has(field);
  if (Array.isArray(value)) {
    return value.map((item) => formatScalar(item, asMoney)).join(", ");
  }
  return formatScalar(value, asMoney);
}

export function formatRule(rule: ProgramRule): string {
  if (rule.explanation && rule.explanation.trim().length > 0) {
    return rule.explanation;
  }

  const field = fieldLabel(rule.field);
  const formatted = formatRuleValue(rule.value, rule.field);

  switch (rule.operator) {
    case "less_than_or_equal":
      return `${field} must be ${formatted} or less.`;
    case "less_than":
      return `${field} must be less than ${formatted}.`;
    case "greater_than_or_equal":
      return `${field} must be ${formatted} or more.`;
    case "greater_than":
      return `${field} must be more than ${formatted}.`;
    case "equals":
      return `${field} must be ${formatted}.`;
    case "not_equals":
      return `${field} must not be ${formatted}.`;
    case "in":
      return `${field} must be one of: ${formatted}.`;
    case "not_in":
      return `${field} must not be one of: ${formatted}.`;
    case "contains":
      return `${field} must include ${formatted}.`;
    case "is_true":
      return `${field} must be yes.`;
    case "is_false":
      return `${field} must be no.`;
    case "exists":
      return `${field} must be provided.`;
    case "not_exists":
      return `${field} must not already be present.`;
    default:
      return `${field} ${rule.operator} ${formatted}`.trim();
  }
}

export function formatCategory(category: string): string {
  const match = programCategories.find((item) => item.slug === category);
  if (match) {
    return match.label;
  }
  return category.replaceAll("-", " ");
}
