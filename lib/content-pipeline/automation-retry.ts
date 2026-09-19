import {
  AUTOMATION_MAX_ATTEMPTS,
  AutomationError,
} from "@/lib/content-pipeline/automation-types";

const TRANSIENT_CODES = new Set([
  "PGRST303",
  "40001",
  "40P01",
  "57014",
  "08006",
  "57P01",
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
]);

const TRANSIENT_MESSAGE = [
  /jwt issued at future/i,
  /pgrst303/i,
  /serialization failure/i,
  /deadlock detected/i,
  /econnreset/i,
  /etimedout/i,
  /socket hang up/i,
  /fetch failed/i,
  /the database system is starting up/i,
];

const NEVER_RETRY_CODES = new Set([
  "validation_failed",
  "blocking_validation_error",
  "malformed_content",
  "malformed_slug",
  "guide_slug_conflict",
  "identity_mismatch",
  "content_pipeline_unauthorized",
  "content_automation_unauthorized",
  "content_automation_disabled",
  "content_pipeline_disabled",
  "publish_disabled",
  "automation_disabled",
  "stale_authoritative_state",
  "missing_authoritative_fingerprint",
  "invalid_provider",
]);

export function classifyRetryability(error: unknown): "transient" | "permanent" {
  if (error instanceof AutomationError && NEVER_RETRY_CODES.has(error.code)) {
    return "permanent";
  }
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  if (NEVER_RETRY_CODES.has(code)) {
    return "permanent";
  }
  if (TRANSIENT_CODES.has(code)) {
    return "transient";
  }
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (TRANSIENT_MESSAGE.some((pattern) => pattern.test(message))) {
    return "transient";
  }
  return "permanent";
}

export function isTransientInfrastructureError(error: unknown): boolean {
  return classifyRetryability(error) === "transient";
}

export type RetrySleep = (ms: number) => Promise<void>;

export type RetryResult<T> = {
  value: T;
  attempts: number;
};

export async function withTransientRetries<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    sleep?: RetrySleep;
    random?: () => number;
  } = {},
): Promise<RetryResult<T>> {
  const maxAttempts = options.maxAttempts ?? AUTOMATION_MAX_ATTEMPTS;
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;
  let attempts = 0;
  let lastError: unknown;
  while (attempts < maxAttempts) {
    attempts += 1;
    try {
      const value = await operation();
      return { value, attempts };
    } catch (error) {
      lastError = error;
      if (!isTransientInfrastructureError(error) || attempts >= maxAttempts) {
        throw error;
      }
      const backoff = 50 * 2 ** (attempts - 1);
      const jitter = Math.floor(random() * 25);
      await sleep(backoff + jitter);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new AutomationError("transient_exhausted", "Transient infrastructure retries exhausted.");
}
