import { timingSafeEqual } from "node:crypto";
import { getContentPipelineSecret, isContentPipelineEnabled } from "@/lib/content-pipeline/config";

export type PipelineAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 403; error: string };

function readPresentedSecret(request: Request): string {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }
  return request.headers.get("x-content-pipeline-secret")?.trim() ?? "";
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

export function authorizeContentPipelineRequest(request: Request): PipelineAuthResult {
  if (!isContentPipelineEnabled()) {
    return { ok: false, status: 403, error: "content_pipeline_disabled" };
  }

  const expected = getContentPipelineSecret();
  if (!expected) {
    return { ok: false, status: 401, error: "content_pipeline_unauthorized" };
  }

  const presented = readPresentedSecret(request);
  if (!secretsEqual(presented, expected)) {
    return { ok: false, status: 401, error: "content_pipeline_unauthorized" };
  }

  return { ok: true };
}
