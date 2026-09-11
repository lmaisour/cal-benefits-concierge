import { isUserProfileField } from "@/lib/eligibility/values";
import type { FollowupAnswersByProgram } from "@/lib/eligibility/types";
import type { ProgramFollowupQuestion } from "@/types/program";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isScalarAnswer(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

/**
 * Keep only answers that belong to known follow-up question keys for that
 * program. Core UserProfile fields cannot be injected through this map.
 */
export function sanitizeFollowupAnswers(
  input: unknown,
  questions: ProgramFollowupQuestion[],
): FollowupAnswersByProgram {
  if (!isPlainObject(input)) {
    return {};
  }

  const keysByProgram = new Map<string, Set<string>>();
  for (const question of questions) {
    if (!question.active) {
      continue;
    }
    const keys = keysByProgram.get(question.program_id) ?? new Set<string>();
    keys.add(question.question_key);
    keysByProgram.set(question.program_id, keys);
  }

  const sanitized: FollowupAnswersByProgram = {};
  for (const [programId, rawAnswers] of Object.entries(input)) {
    const allowedKeys = keysByProgram.get(programId);
    if (!allowedKeys || !isPlainObject(rawAnswers)) {
      continue;
    }
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawAnswers)) {
      if (!allowedKeys.has(key)) {
        continue;
      }
      if (isUserProfileField(key)) {
        continue;
      }
      if (!isScalarAnswer(value)) {
        continue;
      }
      if (typeof value === "string" && value.trim() === "") {
        continue;
      }
      next[key] = typeof value === "string" ? value.trim() : value;
    }
    if (Object.keys(next).length > 0) {
      sanitized[programId] = next;
    }
  }

  return sanitized;
}
