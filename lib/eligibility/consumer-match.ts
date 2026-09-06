import { formatProgramValue } from "@/lib/programs/format";
import { fieldLabel, isRepayableBenefit } from "@/lib/programs/labels";
import type {
  MatchProgramsResult,
  ProgramEvaluation,
} from "@/lib/eligibility/types";
import type { BenefitType, LocationType, Program, ProgramStatus } from "@/types/program";

export const PURCHASE_BEFORE_APPROVAL_WARNING =
  "Do not purchase before approval unless the program administrator confirms otherwise.";

export const REPAYABLE_NOTICE = "Repayable — not free savings";

const GEOGRAPHY_MISSING_LABELS: Record<LocationType, string> = {
  STATE: "State",
  COUNTY: "County",
  CITY: "City",
  ZIP: "ZIP code",
  ELECTRIC_UTILITY: "Electric utility",
  GAS_UTILITY: "Gas utility",
};

const WHY_FIELD_PRIORITY = [
  "household_income",
  "zip",
  "housing_status",
  "homeowner",
  "first_ev",
  "property_type",
  "electric_utility",
  "gas_utility",
  "household_size",
];

export type ConsumerEligibilityStatus = "LIKELY_ELIGIBLE" | "POSSIBLY_ELIGIBLE";

export type ConsumerValueKind = "savings" | "financing" | "none";

export type ConsumerProgramMatch = {
  id: string;
  slug: string;
  name: string;
  administrator: string | null;
  category: string;
  subcategory: string | null;
  benefitSummary: string | null;
  benefitType: BenefitType;
  benefitMin: number | null;
  benefitMax: number | null;
  status: ProgramStatus;
  shortDescription: string | null;
  eligibilityStatus: ConsumerEligibilityStatus;
  whyMatched: string[];
  missingInformation: string[];
  importantWarning: string | null;
  lastVerifiedAt: string | null;
  applicationUrl: string | null;
  officialUrl: string | null;
  isSample: boolean;
  valueKind: ConsumerValueKind;
  valueText: string;
};

export type MatchResponse = {
  likelyEligible: ConsumerProgramMatch[];
  possiblyEligible: ConsumerProgramMatch[];
  counts: {
    likely: number;
    possible: number;
  };
};

export function isSampleProgram(program: Pick<Program, "name" | "application_url" | "official_url">): boolean {
  if (program.name.startsWith("SAMPLE:")) {
    return true;
  }
  const urls = [program.application_url, program.official_url];
  return urls.some((url) => url?.includes("example.invalid") ?? false);
}

export function importantWarningFor(program: Program): string | null {
  if (program.purchase_before_approval_allowed === false) {
    return PURCHASE_BEFORE_APPROVAL_WARNING;
  }
  return null;
}

export function missingInformationFor(evaluation: ProgramEvaluation): string[] {
  const labels = new Set<string>();

  for (const result of evaluation.unknownRequiredRules) {
    labels.add(fieldLabel(result.rule.field));
  }

  if (evaluation.geography.status === "UNKNOWN") {
    for (const type of evaluation.geography.unknownTypes) {
      labels.add(GEOGRAPHY_MISSING_LABELS[type] ?? type);
    }
  }

  return [...labels];
}

export function whyMatchedFor(evaluation: ProgramEvaluation): string[] {
  const passed = [...evaluation.passedRequiredRules].sort((left, right) => {
    const leftRank = WHY_FIELD_PRIORITY.indexOf(left.rule.field);
    const rightRank = WHY_FIELD_PRIORITY.indexOf(right.rule.field);
    return (leftRank === -1 ? 99 : leftRank) - (rightRank === -1 ? 99 : rightRank);
  });

  const reasons: string[] = [];
  for (const result of passed) {
    if (reasons.length >= 3) {
      break;
    }
    const reason = reasonFromPassedRule(result.rule.field, result.explanation);
    if (!reasons.includes(reason)) {
      reasons.push(reason);
    }
  }

  if (evaluation.geography.status === "PASS" && reasons.length < 3) {
    reasons.push(evaluation.geography.explanation);
  }

  return reasons.slice(0, 3);
}

function reasonFromPassedRule(field: string, explanation: string): string {
  if (field === "household_income") {
    return "Your household income appears to meet the published limit.";
  }
  if (field === "zip") {
    return "Your ZIP is within the program’s listed service area.";
  }
  if (field === "housing_status" || field === "homeowner") {
    return "Your housing status appears to meet this requirement.";
  }
  return explanation;
}

export function toConsumerProgramMatch(
  evaluation: ProgramEvaluation,
): ConsumerProgramMatch | null {
  if (
    evaluation.status === "NOT_ELIGIBLE" ||
    !evaluation.program.active ||
    evaluation.program.status === "EXPIRED"
  ) {
    return null;
  }

  const value = formatProgramValue(evaluation.program);
  return {
    id: evaluation.program.id,
    slug: evaluation.program.slug,
    name: evaluation.program.name,
    administrator: evaluation.program.administrator,
    category: evaluation.program.category,
    subcategory: evaluation.program.subcategory,
    benefitSummary: evaluation.program.benefit_summary,
    benefitType: evaluation.program.benefit_type,
    benefitMin: evaluation.program.benefit_min,
    benefitMax: evaluation.program.benefit_max,
    status: evaluation.program.status,
    shortDescription: evaluation.program.short_description,
    eligibilityStatus: evaluation.status,
    whyMatched: whyMatchedFor(evaluation),
    missingInformation:
      evaluation.status === "POSSIBLY_ELIGIBLE"
        ? missingInformationFor(evaluation)
        : [],
    importantWarning: importantWarningFor(evaluation.program),
    lastVerifiedAt: evaluation.program.last_verified_at,
    applicationUrl: evaluation.program.application_url,
    officialUrl: evaluation.program.official_url,
    isSample: isSampleProgram(evaluation.program),
    valueKind: value.kind,
    valueText: value.text,
  };
}

export function toMatchResponse(result: MatchProgramsResult): MatchResponse {
  const likelyEligible = result.likelyEligible
    .map(toConsumerProgramMatch)
    .filter((item): item is ConsumerProgramMatch => item !== null);
  const possiblyEligible = result.possiblyEligible
    .map(toConsumerProgramMatch)
    .filter((item): item is ConsumerProgramMatch => item !== null);

  return {
    likelyEligible,
    possiblyEligible,
    counts: {
      likely: likelyEligible.length,
      possible: possiblyEligible.length,
    },
  };
}

export function financingIsRepayable(benefitType: BenefitType): boolean {
  return isRepayableBenefit(benefitType);
}
