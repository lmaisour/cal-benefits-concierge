import { NEEDS_REVIEW_AFTER_MS } from "@/lib/admin/needs-review";

export function isStaleVerification(
  lastVerifiedAt: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!lastVerifiedAt) {
    return true;
  }
  const verifiedAtMs = Date.parse(lastVerifiedAt);
  if (Number.isNaN(verifiedAtMs)) {
    return true;
  }
  return nowMs - verifiedAtMs > NEEDS_REVIEW_AFTER_MS;
}

export function verificationAgeMs(
  lastVerifiedAt: string | null | undefined,
  nowMs = Date.now(),
): number | null {
  if (!lastVerifiedAt) {
    return null;
  }
  const verifiedAtMs = Date.parse(lastVerifiedAt);
  if (Number.isNaN(verifiedAtMs)) {
    return null;
  }
  return nowMs - verifiedAtMs;
}

export { NEEDS_REVIEW_AFTER_MS };
