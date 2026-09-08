import type { ProgramRow } from "@/types/database";

export const NEEDS_REVIEW_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

export type NeedsReviewInput = Pick<
  ProgramRow,
  "status" | "confidence" | "last_verified_at"
>;

/**
 * A program needs review when verification is missing or older than 30 days,
 * confidence is LOW, or status is UNCERTAIN.
 */
export function programNeedsReview(
  program: NeedsReviewInput,
  nowMs = Date.now(),
): boolean {
  if (program.status === "UNCERTAIN") {
    return true;
  }
  if (program.confidence === "LOW") {
    return true;
  }
  if (!program.last_verified_at) {
    return true;
  }

  const verifiedAtMs = Date.parse(program.last_verified_at);
  if (Number.isNaN(verifiedAtMs)) {
    return true;
  }

  return nowMs - verifiedAtMs > NEEDS_REVIEW_AFTER_MS;
}

export function countProgramsNeedingReview(
  programs: NeedsReviewInput[],
  nowMs = Date.now(),
): number {
  return programs.filter((program) => programNeedsReview(program, nowMs)).length;
}
