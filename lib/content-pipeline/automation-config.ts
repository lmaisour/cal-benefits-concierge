import {
  AUTOMATION_LEASE_SECONDS,
  AUTOMATION_MAX_ATTEMPTS,
} from "@/lib/content-pipeline/automation-types";

export function isContentAutomationEnabled(): boolean {
  return process.env.CONTENT_AUTOMATION_ENABLED === "true";
}

export function getContentAutomationSecret(): string {
  return process.env.CONTENT_AUTOMATION_SECRET?.trim() ?? "";
}

export function getContentAutomationLeaseSeconds(): number {
  const raw = process.env.CONTENT_AUTOMATION_LEASE_SECONDS?.trim();
  if (!raw) {
    return AUTOMATION_LEASE_SECONDS;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 3600) {
    throw new Error("CONTENT_AUTOMATION_LEASE_SECONDS must be between 1 and 3600.");
  }
  return Math.floor(parsed);
}

export function getContentAutomationMaxAttempts(): number {
  return AUTOMATION_MAX_ATTEMPTS;
}
