import { UNMODELED_REQUIRED_CRITERIA_MESSAGE } from "@/data/programs/unmodeled-criteria";
import {
  isUnknownFollowupAnswer,
  parseFollowupOptions,
} from "@/lib/eligibility/evaluate-followup";
import type {
  FollowupRuleEvaluation,
  MatchProgramsResult,
  ProgramEvaluation,
  RuleResultStatus,
} from "@/lib/eligibility/types";
import { formatProgramValue } from "@/lib/programs/format";
import { fieldLabel, isRepayableBenefit } from "@/lib/programs/labels";
import type { BenefitType, LocationType, Program, ProgramFollowupQuestion, ProgramStatus } from "@/types/program";

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

export type ConsumerEligibilityStatus =
  | "LIKELY_ELIGIBLE"
  | "POSSIBLY_ELIGIBLE"
  | "NOT_ELIGIBLE";

export type ConsumerValueKind = "savings" | "financing" | "none";

export type ConsumerFollowupOption = {
  value: string;
  label: string;
};

export type ConsumerFollowupQuestion = {
  key: string;
  question: string;
  helpText: string | null;
  required: boolean;
  options: ConsumerFollowupOption[];
  answer: string | null;
};

export type ConsumerCriterionStatus = "passed" | "failed" | "needs_confirmation";

export type ConsumerCriterion = {
  id: string;
  label: string;
  status: ConsumerCriterionStatus;
  detail: string | null;
};

export type ConsumerFollowup = {
  ctaLabel: string;
  unresolved: boolean;
  questions: ConsumerFollowupQuestion[];
  criteria: ConsumerCriterion[];
};

export type ConsumerProgramMatch = {
  id: string;
  slug: string;
  name: string;
  administrator: string | null;
  consumerHeadline: string | null;
  administratorDisplayName: string | null;
  audienceTags: string[];
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
  additionalRequirements: string | null;
  importantWarning: string | null;
  lastVerifiedAt: string | null;
  applicationUrl: string | null;
  officialUrl: string | null;
  isSample: boolean;
  valueKind: ConsumerValueKind;
  valueText: string;
  followup: ConsumerFollowup | null;
};

export type MatchResponse = {
  likelyEligible: ConsumerProgramMatch[];
  possiblyEligible: ConsumerProgramMatch[];
  notEligible: ConsumerProgramMatch[];
  counts: {
    likely: number;
    possible: number;
    notEligible: number;
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

export function additionalRequirementsFor(
  evaluation: ProgramEvaluation,
): string | null {
  if (
    evaluation.status !== "POSSIBLY_ELIGIBLE" ||
    !evaluation.hasUnmodeledRequiredCriteria
  ) {
    return null;
  }
  const summary = evaluation.unmodeledRequiredCriteriaSummary?.trim();
  return summary && summary.length > 0
    ? summary
    : UNMODELED_REQUIRED_CRITERIA_MESSAGE;
}

export function missingInformationFor(evaluation: ProgramEvaluation): string[] {
  const labels = new Set<string>();

  for (const result of evaluation.unknownRequiredRules) {
    labels.add(fieldLabel(result.rule.field));
  }

  for (const result of evaluation.unknownRequiredFollowupRules) {
    labels.add(result.question.question);
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
  answers: Record<string, unknown> = {},
  questions: ProgramFollowupQuestion[] = [],
): ConsumerProgramMatch | null {
  const followupFailed = evaluation.failedRequiredFollowupRules.length > 0;
  if (
    (evaluation.status === "NOT_ELIGIBLE" && !followupFailed) ||
    !evaluation.program.active ||
    evaluation.program.status === "EXPIRED"
  ) {
    return null;
  }

  const followup = toConsumerFollowup(evaluation, answers, questions);
  const value = formatProgramValue(evaluation.program);
  return {
    id: evaluation.program.id,
    slug: evaluation.program.slug,
    name: evaluation.program.name,
    administrator: evaluation.program.administrator,
    consumerHeadline: evaluation.program.consumer_headline,
    administratorDisplayName: evaluation.program.administrator_display_name,
    audienceTags: evaluation.program.audience_tags ?? [],
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
    additionalRequirements: additionalRequirementsFor(evaluation),
    importantWarning: importantWarningFor(evaluation.program),
    lastVerifiedAt: evaluation.program.last_verified_at,
    applicationUrl: evaluation.program.application_url,
    officialUrl: evaluation.program.official_url,
    isSample: isSampleProgram(evaluation.program),
    valueKind: value.kind,
    valueText: value.text,
    followup,
  };
}

export function toMatchResponse(
  result: MatchProgramsResult,
  followup?: {
    questions: ProgramFollowupQuestion[];
    answersByProgramId: Record<string, Record<string, unknown>>;
  },
): MatchResponse {
  const questionsByProgram = groupQuestions(followup?.questions ?? []);
  const answersByProgram = followup?.answersByProgramId ?? {};

  const likelyEligible = result.likelyEligible
    .map((evaluation) =>
      toConsumerProgramMatch(
        evaluation,
        answersByProgram[evaluation.program.id] ?? {},
        questionsByProgram.get(evaluation.program.id) ?? [],
      ),
    )
    .filter((item): item is ConsumerProgramMatch => item !== null);
  const possiblyEligible = result.possiblyEligible
    .map((evaluation) =>
      toConsumerProgramMatch(
        evaluation,
        answersByProgram[evaluation.program.id] ?? {},
        questionsByProgram.get(evaluation.program.id) ?? [],
      ),
    )
    .filter((item): item is ConsumerProgramMatch => item !== null);
  const notEligible = result.notEligible
    .map((evaluation) =>
      toConsumerProgramMatch(
        evaluation,
        answersByProgram[evaluation.program.id] ?? {},
        questionsByProgram.get(evaluation.program.id) ?? [],
      ),
    )
    .filter((item): item is ConsumerProgramMatch => item !== null);

  return {
    likelyEligible,
    possiblyEligible,
    notEligible,
    counts: {
      likely: likelyEligible.length,
      possible: possiblyEligible.length,
      notEligible: notEligible.length,
    },
  };
}

function groupQuestions(
  questions: ProgramFollowupQuestion[],
): Map<string, ProgramFollowupQuestion[]> {
  const grouped = new Map<string, ProgramFollowupQuestion[]>();
  for (const question of questions) {
    const list = grouped.get(question.program_id) ?? [];
    list.push(question);
    grouped.set(question.program_id, list);
  }
  return grouped;
}

function toConsumerFollowup(
  evaluation: ProgramEvaluation,
  answers: Record<string, unknown>,
  questions: ProgramFollowupQuestion[],
): ConsumerFollowup | null {
  const programQuestions = questions.filter(
    (question) => question.program_id === evaluation.program.id && question.active,
  );
  if (programQuestions.length === 0 && evaluation.followupResults.length === 0) {
    return null;
  }

  const questionsForForm = uniqueQuestions(
    evaluation.followupResults.map((result) => result.question),
  );
  const unresolved = questionsForForm.some((question) => {
    const options = parseFollowupOptions(question.options);
    return isUnknownFollowupAnswer(answers[question.question_key], options);
  });

  return {
    ctaLabel:
      questionsForForm.find((question) => question.cta_label?.trim())?.cta_label?.trim() ||
      programQuestions.find((question) => question.cta_label?.trim())?.cta_label?.trim() ||
      "Check eligibility",
    unresolved,
    questions: questionsForForm.map((question) => {
      const options = parseFollowupOptions(question.options);
      const raw = answers[question.question_key];
      return {
        key: question.question_key,
        question: question.question,
        helpText: question.help_text,
        required: question.required,
        options: options.map((option) => ({ value: option.value, label: option.label })),
        answer: typeof raw === "string" ? raw : raw == null ? null : String(raw),
      };
    }),
    criteria: criteriaFor(evaluation),
  };
}

function uniqueQuestions(questions: ProgramFollowupQuestion[]): ProgramFollowupQuestion[] {
  const seen = new Set<string>();
  const unique: ProgramFollowupQuestion[] = [];
  for (const question of questions.sort((left, right) => left.sort_order - right.sort_order)) {
    if (seen.has(question.id)) {
      continue;
    }
    seen.add(question.id);
    unique.push(question);
  }
  return unique;
}

function criteriaFor(evaluation: ProgramEvaluation): ConsumerCriterion[] {
  const items: ConsumerCriterion[] = [];

  for (const result of evaluation.passedRequiredRules) {
    items.push({
      id: `core-${result.rule.id}`,
      label: fieldLabel(result.rule.field),
      status: "passed",
      detail: result.explanation,
    });
  }
  for (const result of evaluation.failedRequiredRules) {
    items.push({
      id: `core-${result.rule.id}`,
      label: fieldLabel(result.rule.field),
      status: "failed",
      detail: result.explanation,
    });
  }
  for (const result of evaluation.unknownRequiredRules) {
    items.push({
      id: `core-${result.rule.id}`,
      label: fieldLabel(result.rule.field),
      status: "needs_confirmation",
      detail: result.explanation,
    });
  }

  for (const result of evaluation.followupResults.filter((item) => item.rule.required)) {
    items.push(criterionFromFollowup(result));
  }

  if (evaluation.hasUnmodeledRequiredCriteria) {
    const summary =
      evaluation.unmodeledRequiredCriteriaSummary?.trim() ||
      UNMODELED_REQUIRED_CRITERIA_MESSAGE;
    items.push({
      id: "unmodeled",
      label: "Additional published requirements",
      status: "needs_confirmation",
      detail: summary,
    });
  }

  return items;
}

function criterionFromFollowup(result: FollowupRuleEvaluation): ConsumerCriterion {
  return {
    id: `followup-${result.rule.id}`,
    label: result.question.question,
    status: criterionStatus(result.status),
    detail: result.explanation,
  };
}

function criterionStatus(status: RuleResultStatus): ConsumerCriterionStatus {
  if (status === "PASS") {
    return "passed";
  }
  if (status === "FAIL") {
    return "failed";
  }
  return "needs_confirmation";
}

export function financingIsRepayable(benefitType: BenefitType): boolean {
  return isRepayableBenefit(benefitType);
}
