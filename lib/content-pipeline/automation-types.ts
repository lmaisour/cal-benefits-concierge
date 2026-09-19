import type { Json } from "@/types/database";
import type { ProviderMetadata } from "@/lib/content-pipeline/types";

export const AUTOMATION_SCHEDULE_ID = "default" as const;
export const AUTOMATION_LOCK_KEY = "content_cycle" as const;
export const AUTOMATION_CADENCE_MS = 48 * 60 * 60 * 1000;
export const AUTOMATION_MAX_ATTEMPTS = 3;
export const AUTOMATION_LEASE_SECONDS = 180;

export const AUTOMATION_TRIGGERS = ["MANUAL", "CRON"] as const;
export type AutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number];

export const AUTOMATION_STATUSES = [
  "STARTED",
  "NOT_DUE",
  "LOCKED",
  "GENERATED",
  "BLOCKED",
  "ERROR",
  "COMPLETED_DRY_RUN",
] as const;
export type AutomationStatus = (typeof AUTOMATION_STATUSES)[number];

export type AutomationErrorCode =
  | "automation_disabled"
  | "automation_unauthorized"
  | "not_due"
  | "locked"
  | "no_candidate"
  | "validation_failed"
  | "stale_authoritative_state"
  | "missing_authoritative_fingerprint"
  | "invalid_provider"
  | "generation_failed"
  | "lease_lost"
  | "transient_exhausted"
  | "content_automation_failed";

export type AutomationScheduleState = {
  id: typeof AUTOMATION_SCHEDULE_ID;
  last_successful_publish_at: string | null;
  next_publish_at: string;
  updated_at: string;
};

export type AutomationLockResult = {
  acquired: boolean;
  owner_id?: string;
  expires_at?: string;
};

export type AutomationRenewResult = {
  renewed: boolean;
  owner_id?: string;
  expires_at?: string;
};

export type AutomationExecutionRecord = {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: AutomationStatus;
  trigger: AutomationTrigger;
  due: boolean | null;
  lock_owner: string | null;
  pipeline_run_id: string | null;
  opportunity_id: string | null;
  program_id: string | null;
  provider: string | null;
  attempt_count: number;
  drafts_generated: number;
  validation_passed: boolean | null;
  authoritative_state_fingerprint: string | null;
  publish_attempted: boolean;
  publish_succeeded: boolean;
  guide_id: string | null;
  error_code: string | null;
  error_message: string | null;
  provider_usage: ProviderMetadata | Json | null;
  created_at: string;
  updated_at: string;
};

export type CreateAutomationExecutionInput = {
  id: string;
  started_at: string;
  trigger: AutomationTrigger;
  lock_owner?: string | null;
  provider?: string | null;
};

export type UpdateAutomationExecutionInput = Partial<
  Omit<AutomationExecutionRecord, "id" | "created_at" | "started_at" | "trigger">
>;

export class AutomationError extends Error {
  readonly code: AutomationErrorCode;

  constructor(code: AutomationErrorCode, message: string) {
    super(message);
    this.name = "AutomationError";
    this.code = code;
  }
}
