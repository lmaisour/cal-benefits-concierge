import { timingSafeEqual } from "node:crypto";
import {
  getContentAutomationSecret,
  isContentAutomationEnabled,
} from "@/lib/content-pipeline/automation-config";
import type { AutomationAuthResult } from "@/lib/content-pipeline/automation-auth";

export function getContentAutomationCronSecret(): string {
  return process.env.CRON_SECRET?.trim() ?? "";
}

function readPresentedBearerSecret(request: Request): string {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }
  return "";
}

function secretsEqual(presented: string, expected: string): boolean {
  const presentedBuffer = Buffer.from(presented);
  const expectedBuffer = Buffer.from(expected);
  if (presentedBuffer.length !== expectedBuffer.length) {
    if (expectedBuffer.length > 0) {
      timingSafeEqual(expectedBuffer, expectedBuffer);
    }
    return false;
  }
  return timingSafeEqual(presentedBuffer, expectedBuffer);
}

export function authorizeContentAutomationCronRequest(
  request: Request,
): AutomationAuthResult {
  const expected = getContentAutomationCronSecret();
  if (!expected) {
    return { ok: false, status: 401, error: "content_automation_unauthorized" };
  }

  const presented = readPresentedBearerSecret(request);
  if (!secretsEqual(presented, expected)) {
    return { ok: false, status: 401, error: "content_automation_unauthorized" };
  }

  if (!isContentAutomationEnabled()) {
    return { ok: false, status: 403, error: "content_automation_disabled" };
  }

  if (!getContentAutomationSecret()) {
    return { ok: false, status: 401, error: "content_automation_unauthorized" };
  }

  return { ok: true };
}
