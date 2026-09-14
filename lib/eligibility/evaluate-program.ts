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
 * A required follow-up with `satisfies_rule_group = N` is an OR alternative
 * for core group N — not an independent AND. Follow-ups with a null
 * `satisfies_rule_group` stay independent AND requirements. This is generic
 * and not program-specific.
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

  const coreGroups = foldGroups(requiredResults, true);
  const coreGroupStatuses = new Map(
    coreGroups.map((group) => [group.ruleGroup, group.status]),
  );
  const geography = evaluateGeography(program, locations, profile);
  const followupResults = evaluateFollowupForProgram(
    program.id,
    profile,
    followup,
    coreGroupStatuses,
  );
  const requiredFollowup = followupResults.filter((result) => result.rule.required);
  const { requiredGroups, independentFollowupStatuses } = combineCoreAndFollowup(
    coreGroups,
    requiredFollowup,
  );

  const combined = andStatuses([
    ...requiredGroups.map((group) => group.status),
    geography.status,
    ...independentFollowupStatuses,
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
  coreGroupStatuses?: ReadonlyMap<number, RuleResultStatus>,
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
    { questions, rules, answers: followup.answers, coreGroupStatuses },
    profile,
  );
}

/**
 * Fold follow-ups that declare `satisfies_rule_group` into that core group
 * with OR semantics. Independent follow-ups remain AND requirements.
 */
function combineCoreAndFollowup(
  coreGroups: RuleGroupEvaluation[],
  requiredFollowup: FollowupRuleEvaluation[],
): {
  requiredGroups: RuleGroupEvaluation[];
  independentFollowupStatuses: RuleResultStatus[];
} {
  const alternateByGroup = new Map<number, RuleResultStatus[]>();
  const independentFollowupStatuses: RuleResultStatus[] = [];

  for (const result of requiredFollowup) {
    const group = result.rule.satisfies_rule_group;
    if (group == null) {
      independentFollowupStatuses.push(result.status);
      continue;
    }
    const existing = alternateByGroup.get(group) ?? [];
    existing.push(result.status);
    alternateByGroup.set(group, existing);
  }

  const coreGroupNumbers = new Set(coreGroups.map((group) => group.ruleGroup));
  const requiredGroups = coreGroups.map((group) => {
    const alternates = alternateByGroup.get(group.ruleGroup);
    if (!alternates?.length) {
      return group;
    }
    return {
      ...group,
      status: foldGroupStatus([group.status, ...alternates], "OR"),
    };
  });

  for (const [groupNumber, statuses] of alternateByGroup) {
    if (coreGroupNumbers.has(groupNumber)) {
      continue;
    }
    independentFollowupStatuses.push(foldGroupStatus(statuses, "OR"));
  }

  return { requiredGroups, independentFollowupStatuses };
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
