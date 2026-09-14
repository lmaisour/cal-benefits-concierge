/**
 * Server-only content-pipeline flags.
 * These must never be imported from client components.
 */

export function isContentPipelineEnabled(): boolean {
  return process.env.CONTENT_PIPELINE_ENABLED === "true";
}

export function getContentPipelineSecret(): string {
  return process.env.CONTENT_PIPELINE_SECRET?.trim() ?? "";
}

/**
 * Future-safe flag. Publication is not implemented and must stay unused.
 */
export function isAutoPublishEnabled(): boolean {
  return false;
}

export function getDraftProviderId(): string {
  const value = process.env.CONTENT_PIPELINE_DRAFT_PROVIDER?.trim().toLowerCase();
  return value && value.length > 0 ? value : "fake";
}
