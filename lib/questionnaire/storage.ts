import type { UserProfile } from "@/lib/eligibility/types";
import { USER_PROFILE_FIELDS } from "@/lib/eligibility/types";
import {
  clampStepId,
  isQuestionnaireStepId,
  type QuestionnaireStepId,
} from "@/lib/questionnaire/steps";

export const QUESTIONNAIRE_STORAGE_KEY = "cbf.questionnaire.v1";
export const QUESTIONNAIRE_CHANGE_EVENT = "cbf-questionnaire-change";

export function subscribeQuestionnaire(onChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(QUESTIONNAIRE_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(QUESTIONNAIRE_CHANGE_EVENT, onChange);
}

export function getQuestionnaireSnapshot(): string {
  if (typeof window === "undefined") {
    return "";
  }
  try {
    return sessionStorage.getItem(QUESTIONNAIRE_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function getQuestionnaireServerSnapshot(): string {
  return "";
}

function notifyQuestionnaireListeners(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(QUESTIONNAIRE_CHANGE_EVENT));
}

export type QuestionnairePersistedState = {
  profile: UserProfile;
  stepId: QuestionnaireStepId;
  completed: boolean;
  /** Fields the resident explicitly skipped (Prefer not to say / Not sure). */
  skipped: string[];
};

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeProfile(value: unknown): UserProfile {
  if (!isPlainObject(value)) {
    return {};
  }

  const profile: UserProfile = {};
  for (const field of USER_PROFILE_FIELDS) {
    if (!(field in value)) {
      continue;
    }
    const next = value[field];
    if (next === undefined) {
      continue;
    }
    (profile as Record<string, unknown>)[field] = next;
  }
  return profile;
}

export function parseQuestionnaireSnapshot(
  raw: string,
): QuestionnairePersistedState | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) {
      return null;
    }
    const profile = sanitizeProfile(parsed.profile);
    const requestedStep =
      typeof parsed.stepId === "string" && isQuestionnaireStepId(parsed.stepId)
        ? parsed.stepId
        : "zip";
    return {
      profile,
      stepId: clampStepId(profile, requestedStep),
      completed: parsed.completed === true,
      skipped: Array.isArray(parsed.skipped)
        ? parsed.skipped.filter((item): item is string => typeof item === "string")
        : [],
    };
  } catch {
    return null;
  }
}

export function readQuestionnaireState(): QuestionnairePersistedState | null {
  return parseQuestionnaireSnapshot(getQuestionnaireSnapshot());
}

export function writeQuestionnaireState(
  state: QuestionnairePersistedState,
): void {
  if (!canUseSessionStorage()) {
    return;
  }
  try {
    sessionStorage.setItem(QUESTIONNAIRE_STORAGE_KEY, JSON.stringify(state));
    notifyQuestionnaireListeners();
  } catch {
    // Private mode or quota — progress is kept in memory for this visit.
  }
}

export function markSkipped(skipped: string[], field: string): string[] {
  return skipped.includes(field) ? skipped : [...skipped, field];
}

export function unmarkSkipped(skipped: string[], field: string): string[] {
  return skipped.filter((item) => item !== field);
}

export function wasSkipped(skipped: string[], field: string): boolean {
  return skipped.includes(field);
}

export function clearQuestionnaireState(): void {
  if (!canUseSessionStorage()) {
    return;
  }
  try {
    sessionStorage.removeItem(QUESTIONNAIRE_STORAGE_KEY);
    notifyQuestionnaireListeners();
  } catch {
    // Ignore storage failures when starting over.
  }
}
