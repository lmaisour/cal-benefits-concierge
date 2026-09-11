import { evaluateGeography } from "@/lib/eligibility/evaluate-geography";
import { evaluateFollowupRules } from "@/lib/eligibility/evaluate-followup";
import { evaluateRule } from "@/lib/eligibility/evaluate-rule";
import type {
  FollowupEvaluationInput,
  FollowupRuleEvaluation,
  ProgramEvaluation,
  ProgramEligibilityStatus,
  RuleEvaluation,
  RuleGroupEvaluation,
  RuleResultStatus,
  UserProfile,
} from "@/lib/eligibility/types";
import type {
  Program,
  ProgramLocation,
  ProgramRule,
  RuleGroupOperator,
} from "@/types/program";

/**
 * Program-level eligibility. Required groups are AND'd together, then AND'd
 * with geography. Optional rules (`required = false`) are evaluated for
 * explanations only and never make a program NOT_ELIGIBLE.
 *
 * Group fold (same `rule_group`):
 * - AND: any FAIL → FAIL; else any UNKNOWN → UNKNOWN; else PASS
 * - OR:  any PASS → PASS; else any UNKNOWN → UNKNOWN; else FAIL
 *
 * If rules in one group disagree on `group_operator`, the first rule's
 * operator is used. The schema does not encode nested Boolean logic.
 *
 * Individual required-rule lists (`failedRequiredRules`, …) stay raw rule
 * results. An OR alternative can FAIL while the group — and the program —
 * still PASSes.
 *
 * Geography is a required gate, evaluated separately from `program_rules`.
 *
 * If every executable required group and geography PASSes, but
 * `has_unmodeled_required_criteria` is true, the program stays
 * POSSIBLY_ELIGIBLE. Unmodeled criteria are never treated as PASS or FAIL.
 */
export function evaluateProgram(
  program: Program,
  rules: ProgramRule[],
  locations: ProgramLocation[],
  profile: UserProfile,
  followup?: FollowupEvaluationInput,
): ProgramEvaluation {
  const programRules = rules.filter((rule) => rule.program_id === program.id);
  const ruleResults = programRules.map((rule) => evaluateRule(rule, profile));

  const requiredResults = ruleResults.filter((result) => result.rule.required);
  const optionalRuleResults = ruleResults.filter(
    (result) => !result.rule.required,
  );

  const requiredGroups = foldGroups(requiredResults, true);
  const geography = evaluateGeography(program, locations, profile);
  const followupResults = evaluateFollowupForProgram(program.id, profile, followup);
  const requiredFollowup = followupResults.filter((result) => result.rule.required);

  const groupStatuses = requiredGroups.map((group) => group.status);
  const followupStatuses = requiredFollowup.map((result) => result.status);
  const combined = andStatuses([
    ...groupStatuses,
    geography.status,
    ...followupStatuses,
  ]);
  const status = programStatusFromRequired(
    combined,
    program.has_unmodeled_required_criteria,
  );

  return {
    program,
    status,
    ruleResults,
    failedRequiredRules: requiredResults.filter((result) => result.status === "FAIL"),
    unknownRequiredRules: requiredResults.filter(
      (result) => result.status === "UNKNOWN",
    ),
    passedRequiredRules: requiredResults.filter((result) => result.status === "PASS"),
    requiredGroups,
    optionalRuleResults,
    geography,
    hasUnmodeledRequiredCriteria: program.has_unmodeled_required_criteria,
    unmodeledRequiredCriteriaSummary: program.unmodeled_required_criteria_summary,
    followupResults,
    failedRequiredFollowupRules: requiredFollowup.filter((result) => result.status === "FAIL"),
    unknownRequiredFollowupRules: requiredFollowup.filter(
      (result) => result.status === "UNKNOWN",
    ),
    passedRequiredFollowupRules: requiredFollowup.filter((result) => result.status === "PASS"),
  };
}

function evaluateFollowupForProgram(
  programId: string,
  profile: UserProfile,
  followup?: FollowupEvaluationInput,
): FollowupRuleEvaluation[] {
  if (!followup) {
    return [];
  }
  const questions = followup.questions.filter((question) => question.program_id === programId);
  const rules = followup.rules.filter((rule) => rule.program_id === programId);
  if (questions.length === 0 && rules.length === 0) {
    return [];
  }
  return evaluateFollowupRules(
    { questions, rules, answers: followup.answers },
    profile,
  );
}

export function foldGroupStatus(
  statuses: RuleResultStatus[],
  operator: RuleGroupOperator,
): RuleResultStatus {
  if (statuses.length === 0) {
    return "PASS";
  }

  if (operator === "OR") {
    if (statuses.some((status) => status === "PASS")) {
      return "PASS";
    }
    if (statuses.some((status) => status === "UNKNOWN")) {
      return "UNKNOWN";
    }
    return "FAIL";
  }

  if (statuses.some((status) => status === "FAIL")) {
    return "FAIL";
  }
  if (statuses.some((status) => status === "UNKNOWN")) {
    return "UNKNOWN";
  }
  return "PASS";
}

function foldGroups(
  results: RuleEvaluation[],
  required: boolean,
): RuleGroupEvaluation[] {
  const groups = new Map<number, RuleEvaluation[]>();
  for (const result of results) {
    const existing = groups.get(result.rule.rule_group) ?? [];
    existing.push(result);
    groups.set(result.rule.rule_group, existing);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([ruleGroup, ruleResults]) => {
      const operator = ruleResults[0]?.rule.group_operator ?? "AND";
      return {
        ruleGroup,
        operator,
        required,
        status: foldGroupStatus(
          ruleResults.map((result) => result.status),
          operator,
        ),
        ruleResults,
      };
    });
}

function andStatuses(statuses: RuleResultStatus[]): RuleResultStatus {
  return foldGroupStatus(statuses, "AND");
}

function programStatusFromRequired(
  requiredStatus: RuleResultStatus,
  hasUnmodeledRequiredCriteria: boolean,
): ProgramEligibilityStatus {
  if (requiredStatus === "FAIL") {
    return "NOT_ELIGIBLE";
  }
  if (requiredStatus === "UNKNOWN") {
    return "POSSIBLY_ELIGIBLE";
  }
  if (hasUnmodeledRequiredCriteria) {
    return "POSSIBLY_ELIGIBLE";
  }
  return "LIKELY_ELIGIBLE";
}
