import {
  USER_PROFILE_FIELDS,
  type UserProfile,
  type UserProfileField,
} from "@/lib/eligibility/types";

/**
 * A profile value is missing when it is undefined, null, or a blank string.
 * `false`, `0`, and `[]` are present values and must not be coerced away.
 */
export function isMissing(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === "string" && value.trim() === "") {
    return true;
  }
  return false;
}

export function isUserProfileField(field: string): field is UserProfileField {
  return (USER_PROFILE_FIELDS as readonly string[]).includes(field);
}

export function getProfileValue(
  profile: UserProfile,
  field: string,
): unknown {
  if (!isUserProfileField(field)) {
    return undefined;
  }
  return profile[field];
}

/** Trim only. Callers compare with the returned copy; stored values are not mutated. */
export function trimString(value: string): string {
  return value.trim();
}

export function normalizeString(value: string): string {
  return value.trim().toLowerCase();
}

const CLEAN_NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

export function isNumericString(value: unknown): value is string {
  return typeof value === "string" && CLEAN_NUMBER.test(value.trim());
}

/**
 * Convert a value to a finite number when it is already a number or a clean
 * numeric string. Objects, booleans, and dirty strings return undefined.
 */
export function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (isNumericString(value)) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Strict, predictable equality used by equals / not_equals / in / not_in.
 * Returns `undefined` when the pair cannot be compared safely (caller → UNKNOWN).
 */
export function valuesEqual(left: unknown, right: unknown): boolean | undefined {
  if (typeof left === "boolean" && typeof right === "boolean") {
    return left === right;
  }

  if (typeof left === "number" || typeof right === "number") {
    const leftNumber = asNumber(left);
    const rightNumber = asNumber(right);
    if (leftNumber !== undefined && rightNumber !== undefined) {
      return leftNumber === rightNumber;
    }
    return undefined;
  }

  if (typeof left === "string" && typeof right === "string") {
    return normalizeString(left) === normalizeString(right);
  }

  return undefined;
}

export function asUnknownArray(value: unknown): unknown[] | undefined {
  if (Array.isArray(value)) {
    return value;
  }
  return undefined;
}
