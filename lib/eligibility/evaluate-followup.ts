import { evaluateOperator } from "@/lib/eligibility/evaluate-rule";
import type {
  FollowupEvaluationInput,
  FollowupOption,
  FollowupRuleEvaluation,
  UserProfile,
} from "@/lib/eligibility/types";
import {
  getProfileValue,
  isMissing,
  isPlainObject,
  normalizeString,
} from "@/lib/eligibility/values";
import type { ProgramFollowupQuestion, ProgramFollowupRule } from "@/types/program";

const UNKNOWN_ANSWER_TOKENS = new Set(["not_sure", "unknown", "unsure"]);

export function parseFollowupOptions(options: unknown): FollowupOption[] {
  if (!Array.isArray(options)) {
    return [];
  }
  const parsed: FollowupOption[] = [];
  for (const item of options) {
    if (!isPlainObject(item) || typeof item.value !== "string" || typeof item.label !== "string") {
      continue;
    }
    const value = item.value.trim();
    const label = item.label.trim();
    if (!value || !label) {
      continue;
    }
    parsed.push({
      value,
      label,
      unknown: item.unknown === true,
    });
  }
  return parsed;
}

export function isUnknownFollowupAnswer(
  value: unknown,
  options: FollowupOption[] = [],
): boolean {
  if (isMissing(value)) {
    return true;
  }
  if (typeof value === "string" && UNKNOWN_ANSWER_TOKENS.has(normalizeString(value))) {
    return true;
  }
  const match = options.find((option) => option.value === value);
  return match?.unknown === true;
}

/**
 * Show the question unless the display condition known-fails against the
 * core profile. UNKNOWN (missing profile field) still shows the question.
 */
export function isFollowupQuestionVisible(
  question: ProgramFollowupQuestion,
  profile: UserProfile,
): boolean {
  if (!question.active) {
    return false;
  }
  if (!question.display_when_field || !question.display_when_operator) {
    return true;
  }
  const status = evaluateOperator(
    question.display_when_operator,
    getProfileValue(profile, question.display_when_field),
    question.display_when_value,
  );
  return status !== "FAIL";
}

export function evaluateFollowupRules(
  input: FollowupEvaluationInput,
  profile: UserProfile,
): FollowupRuleEvaluation[] {
  const questionsById = new Map(input.questions.map((question) => [question.id, question]));
  const results: FollowupRuleEvaluation[] = [];

  for (const rule of input.rules) {
    const question = questionsById.get(rule.question_id);
    if (!question || question.program_id !== rule.program_id) {
      continue;
    }
    if (!isFollowupQuestionVisible(question, profile)) {
      continue;
    }

    const options = parseFollowupOptions(question.options);
    const rawAnswer = input.answers[question.question_key];
    const actual = isUnknownFollowupAnswer(rawAnswer, options) ? undefined : rawAnswer;
    const status = evaluateOperator(rule.operator, actual, rule.expected_value);
    results.push({
      rule,
      question,
      status,
      explanation: explanationForFollowup(question, rule, status),
      applicable: true,
    });
  }

  return results;
}

function explanationForFollowup(
  question: ProgramFollowupQuestion,
  rule: ProgramFollowupRule,
  status: FollowupRuleEvaluation["status"],
): string {
  if (rule.explanation && rule.explanation.trim()) {
    if (status === "UNKNOWN") {
      return `We still need to confirm: ${question.question}`;
    }
    return rule.explanation;
  }
  if (status === "PASS") {
    return `You appear to meet this requirement: ${question.question}`;
  }
  if (status === "FAIL") {
    return `This answer does not appear to meet this requirement: ${question.question}`;
  }
  return `We still need to confirm: ${question.question}`;
}

export function visibleFollowupQuestions(
  questions: ProgramFollowupQuestion[],
  profile: UserProfile,
): ProgramFollowupQuestion[] {
  return questions
    .filter((question) => isFollowupQuestionVisible(question, profile))
    .sort((left, right) => left.sort_order - right.sort_order || left.question.localeCompare(right.question));
}
