import type { UserProfile } from "@/lib/eligibility/types";
import { hasVehicleInterest } from "@/lib/questionnaire/interests";

export const QUESTIONNAIRE_STEP_IDS = [
  "zip",
  "household_size",
  "household_income",
  "housing_status",
  "property_type",
  "age",
  "has_children",
  "veteran",
  "disability",
  "electric_utility",
  "gas_utility",
  "interests",
  "owned_zev_before",
  "vehicle_condition",
  "vehicle_price",
  "willing_to_retire_vehicle",
] as const;

export type QuestionnaireStepId = (typeof QUESTIONNAIRE_STEP_IDS)[number];

export const BASE_STEP_IDS: QuestionnaireStepId[] = [
  "zip",
  "household_size",
  "household_income",
  "housing_status",
  "property_type",
  "age",
  "has_children",
  "veteran",
  "disability",
  "electric_utility",
  "gas_utility",
  "interests",
];

export const VEHICLE_STEP_IDS: QuestionnaireStepId[] = [
  "owned_zev_before",
  "vehicle_condition",
  "vehicle_price",
  "willing_to_retire_vehicle",
];

export const REQUIRED_STEP_IDS: readonly QuestionnaireStepId[] = [
  "zip",
  "household_size",
  "housing_status",
  "property_type",
];

export function isQuestionnaireStepId(
  value: string,
): value is QuestionnaireStepId {
  return (QUESTIONNAIRE_STEP_IDS as readonly string[]).includes(value);
}

export function getVisibleStepIds(
  profile: UserProfile,
): QuestionnaireStepId[] {
  if (hasVehicleInterest(profile.interests)) {
    return [...BASE_STEP_IDS, ...VEHICLE_STEP_IDS];
  }
  return [...BASE_STEP_IDS];
}

export function getProgress(
  profile: UserProfile,
  stepId: QuestionnaireStepId,
): { current: number; total: number } {
  const steps = getVisibleStepIds(profile);
  const index = steps.indexOf(stepId);
  return {
    current: index >= 0 ? index + 1 : 1,
    total: steps.length,
  };
}

export function getNextStepId(
  profile: UserProfile,
  stepId: QuestionnaireStepId,
): QuestionnaireStepId | "complete" {
  const steps = getVisibleStepIds(profile);
  const index = steps.indexOf(stepId);
  if (index < 0 || index >= steps.length - 1) {
    return "complete";
  }
  return steps[index + 1] ?? "complete";
}

export function getPreviousStepId(
  profile: UserProfile,
  stepId: QuestionnaireStepId,
): QuestionnaireStepId | null {
  const steps = getVisibleStepIds(profile);
  const index = steps.indexOf(stepId);
  if (index <= 0) {
    return null;
  }
  return steps[index - 1] ?? null;
}

export function clampStepId(
  profile: UserProfile,
  stepId: string,
): QuestionnaireStepId {
  const steps = getVisibleStepIds(profile);
  if (isQuestionnaireStepId(stepId) && steps.includes(stepId)) {
    return stepId;
  }
  if (isQuestionnaireStepId(stepId)) {
    return steps[steps.length - 1] ?? "zip";
  }
  return steps[0] ?? "zip";
}

export function isRequiredStep(stepId: QuestionnaireStepId): boolean {
  return REQUIRED_STEP_IDS.includes(stepId);
}
