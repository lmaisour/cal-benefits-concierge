export { evaluateGeography } from "@/lib/eligibility/evaluate-geography";
export { evaluateProgram, foldGroupStatus } from "@/lib/eligibility/evaluate-program";
export { evaluateRule } from "@/lib/eligibility/evaluate-rule";
export { explainGeography, explainRule, fieldLabel } from "@/lib/eligibility/explanations";
export { matchPrograms } from "@/lib/eligibility/match-programs";
export type {
  GeographyEvaluation,
  MatchProgramsResult,
  ProgramEligibilityStatus,
  ProgramEvaluation,
  RuleEvaluation,
  RuleGroupEvaluation,
  RuleResultStatus,
  UserProfile,
  UserProfileField,
} from "@/lib/eligibility/types";
export { USER_PROFILE_FIELDS } from "@/lib/eligibility/types";
