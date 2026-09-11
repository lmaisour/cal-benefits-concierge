import { evaluateProgram } from "@/lib/eligibility/evaluate-program";
import type {
  FollowupMatchInput,
  MatchProgramsResult,
  ProgramEvaluation,
  UserProfile,
} from "@/lib/eligibility/types";
import type { Program, ProgramLocation, ProgramRule } from "@/types/program";

/**
 * Evaluate every program against the profile. Sort order is input order
 * within each bucket. This milestone does not total potential savings.
 *
 * `followup` is optional. Programs without follow-up questions keep the same
 * core-rule + geography outcome they would have had without this argument.
 */
export function matchPrograms(
  programs: Program[],
  rules: ProgramRule[],
  locations: ProgramLocation[],
  profile: UserProfile,
  followup?: FollowupMatchInput,
): MatchProgramsResult {
  const likelyEligible: ProgramEvaluation[] = [];
  const possiblyEligible: ProgramEvaluation[] = [];
  const notEligible: ProgramEvaluation[] = [];

  for (const program of programs) {
    const evaluation = evaluateProgram(program, rules, locations, profile, followupFor(program.id, followup));
    bucket(evaluation, likelyEligible, possiblyEligible, notEligible);
  }

  return { likelyEligible, possiblyEligible, notEligible };
}

function followupFor(programId: string, followup?: FollowupMatchInput) {
  if (!followup) {
    return undefined;
  }
  return {
    questions: followup.questions.filter((question) => question.program_id === programId),
    rules: followup.rules.filter((rule) => rule.program_id === programId),
    answers: followup.answersByProgramId[programId] ?? {},
  };
}

function bucket(
  evaluation: ProgramEvaluation,
  likelyEligible: ProgramEvaluation[],
  possiblyEligible: ProgramEvaluation[],
  notEligible: ProgramEvaluation[],
): void {
  switch (evaluation.status) {
    case "LIKELY_ELIGIBLE":
      likelyEligible.push(evaluation);
      return;
    case "POSSIBLY_ELIGIBLE":
      possiblyEligible.push(evaluation);
      return;
    case "NOT_ELIGIBLE":
      notEligible.push(evaluation);
  }
}
