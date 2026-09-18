import { createHash } from "node:crypto";

const NAMESPACE = "benefits-concierge-content-pipeline";

export function deterministicUuid(key: string): string {
  const hash = createHash("sha256").update(`${NAMESPACE}:${key}`).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `8${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join("-");
}

export function catalogProgramId(externalId: string): string {
  return deterministicUuid(`program:${externalId}`);
}

export function opportunityId(opportunityType: string, programId: string): string {
  return deterministicUuid(`opportunity:${opportunityType}:${programId}`);
}

export function newRunId(): string {
  return crypto.randomUUID();
}

export function publishedGuideId(opportunityId: string): string {
  return deterministicUuid(`published-guide:${opportunityId}`);
}
