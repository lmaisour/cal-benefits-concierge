import { timingSafeEqual } from "node:crypto";
import {
  getContentAutomationSecret,
  isContentAutomationEnabled,
} from "@/lib/content-pipeline/automation-config";

export type AutomationAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 403; error: string };

function readPresentedSecret(request: Request): string {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }
  return request.headers.get("x-content-automation-secret")?.trim() ?? "";
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

export function authorizeContentAutomationRequest(request: Request): AutomationAuthResult {
  if (!isContentAutomationEnabled()) {
    return { ok: false, status: 403, error: "content_automation_disabled" };
  }

  const expected = getContentAutomationSecret();
  if (!expected) {
    return { ok: false, status: 401, error: "content_automation_unauthorized" };
  }

  const presented = readPresentedSecret(request);
  if (!secretsEqual(presented, expected)) {
    return { ok: false, status: 401, error: "content_automation_unauthorized" };
  }

  return { ok: true };
}
