import { conciseBenefitPhrase } from "@/lib/programs/benefit-phrase";
import {
  formatProgramValue,
  formatUsd,
  toNumber,
} from "@/lib/programs/format";
import { benefitTypeLabel, isRepayableBenefit } from "@/lib/programs/labels";
import { REPAYABLE_NOTICE } from "@/lib/eligibility/consumer-match";
import type { BenefitType } from "@/types/database";
import type { Program } from "@/types/program";

const MONEY_HERO_TYPES = new Set<BenefitType>([
  "CASH",
  "REBATE",
  "TAX_CREDIT",
  "BILL_SAVINGS",
  "FORGIVABLE_LOAN",
  "LOAN",
  "FINANCING",
]);

export type ProgramValueHeroDisplay = {
  headline: string;
  kicker: string;
  periodLabel: string | null;
  financingNotice: string | null;
};

const KICKER_BY_TYPE: Record<BenefitType, string> = {
  CASH: "Potential cash benefit",
  REBATE: "Potential rebate",
  TAX_CREDIT: "Potential tax credit",
  BILL_SAVINGS: "Potential bill savings",
  FREE_SERVICE: "Free service",
  FREE_PRODUCT: "Free product",
  FORGIVABLE_LOAN: "Potential forgivable loan",
  LOAN: "Potential loan amount",
  FINANCING: "Potential financing",
  OTHER: "Potential benefit",
};

function periodLabel(period: string | null): string | null {
  if (!period?.trim()) {
    return null;
  }
  const normalized = period.trim().toLowerCase();
  if (normalized === "one_time" || normalized === "one-time") {
    return "One-time";
  }
  if (normalized === "month" || normalized === "monthly") {
    return "Per month";
  }
  if (normalized === "year" || normalized === "annual" || normalized === "annually") {
    return "Per year";
  }
  return period.trim().replaceAll("_", " ");
}

function numericHeadline(program: Program): string | null {
  if (!MONEY_HERO_TYPES.has(program.benefit_type)) {
    return null;
  }
  const min = toNumber(program.benefit_min);
  const max = toNumber(program.benefit_max);
  if (isRepayableBenefit(program.benefit_type)) {
    if (min !== null && max !== null && min !== max) {
      return `${formatUsd(min)}–${formatUsd(max)}`;
    }
    if (max !== null) {
      return `Up to ${formatUsd(max)}`;
    }
    if (min !== null) {
      return `From ${formatUsd(min)}`;
    }
    return null;
  }

  if (min !== null && max !== null && min !== max) {
    return `${formatUsd(min)}–${formatUsd(max)}`;
  }
  const formatted = formatProgramValue(program);
  if (formatted.text.trim()) {
    return formatted.text.trim();
  }
  return null;
}

export function programValueHeroDisplay(
  program: Program,
): ProgramValueHeroDisplay | null {
  const numeric = numericHeadline(program);
  const summary = conciseBenefitPhrase(program.benefit_summary);
  const headline = numeric ?? (summary ? summary[0].toUpperCase() + summary.slice(1) : null);
  if (!headline) {
    return null;
  }

  const financing = isRepayableBenefit(program.benefit_type);
  return {
    headline,
    kicker: valueHeroKicker(program.benefit_type),
    periodLabel: periodLabel(program.benefit_period),
    financingNotice: financing ? REPAYABLE_NOTICE : null,
  };
}

export function valueHeroKicker(type: BenefitType): string {
  return KICKER_BY_TYPE[type] ?? benefitTypeLabel(type);
}
