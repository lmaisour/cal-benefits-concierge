import { evaluateProgram } from "@/lib/eligibility/evaluate-program";
import type {
  MatchProgramsResult,
  ProgramEvaluation,
  UserProfile,
} from "@/lib/eligibility/types";
import type { Program, ProgramLocation, ProgramRule } from "@/types/program";

/**
 * Evaluate every program against the profile. Sort order is input order
 * within each bucket. This milestone does not total potential savings.
 */
export function matchPrograms(
  programs: Program[],
  rules: ProgramRule[],
  locations: ProgramLocation[],
  profile: UserProfile,
): MatchProgramsResult {
  const likelyEligible: ProgramEvaluation[] = [];
  const possiblyEligible: ProgramEvaluation[] = [];
  const notEligible: ProgramEvaluation[] = [];

  for (const program of programs) {
    const evaluation = evaluateProgram(program, rules, locations, profile);
    bucket(evaluation, likelyEligible, possiblyEligible, notEligible);
  }

  return { likelyEligible, possiblyEligible, notEligible };
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
