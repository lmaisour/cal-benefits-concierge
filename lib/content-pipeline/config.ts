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
 * Manual/autonomous publication kill switch. Default disabled.
 * The future autonomous publisher must use this same flag.
 */
export function isContentPipelinePublishEnabled(): boolean {
  return process.env.CONTENT_PIPELINE_PUBLISH_ENABLED === "true";
}

/**
 * Auto-publish / cron remains unused. Manual and future autonomous
 * publishing both call publishGuide() behind the kill switch above.
 * Publication writes go through public.publish_content_guide() so the
 * guide row, guide_programs relationship, and opportunity.guide_id
 * commit or roll back together.
 */
export function isAutoPublishEnabled(): boolean {
  return false;
}

export function getDraftProviderId(): string {
  const value = process.env.CONTENT_PIPELINE_DRAFT_PROVIDER?.trim().toLowerCase();
  return value && value.length > 0 ? value : "fake";
}

export const DRAFT_PROVIDER_IDS = ["fake", "openai"] as const;

export type DraftProviderId = (typeof DRAFT_PROVIDER_IDS)[number];

export type OpenAiDraftConfig = {
  apiKey: string;
  model: string;
  baseUrl: string;
  timeoutMs: number;
  maxOutputTokens: number;
  maxRetries: number;
};

function readPositiveInt(name: string, fallback: number): number {
  return readInt(name, fallback, 1);
}

function readNonNegativeInt(name: string, fallback: number): number {
  return readInt(name, fallback, 0);
}

function readInt(name: string, fallback: number, minimum: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < minimum) {
    throw new Error(`${name} must be a number greater than or equal to ${minimum}.`);
  }
  return Math.floor(parsed);
}

export function getOpenAiDraftConfig(): OpenAiDraftConfig {
  const apiKey =
    process.env.CONTENT_PIPELINE_LLM_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    "";
  const baseUrl = (
    process.env.CONTENT_PIPELINE_LLM_BASE_URL?.trim() || "https://api.openai.com/v1"
  ).replace(/\/+$/, "");
  return {
    apiKey,
    model: process.env.CONTENT_PIPELINE_LLM_MODEL?.trim() || "gpt-5.6-luna",
    baseUrl,
    timeoutMs: readPositiveInt("CONTENT_PIPELINE_LLM_TIMEOUT_MS", 20000),
    maxOutputTokens: readPositiveInt("CONTENT_PIPELINE_LLM_MAX_OUTPUT_TOKENS", 1200),
    maxRetries: readNonNegativeInt("CONTENT_PIPELINE_LLM_MAX_RETRIES", 2),
  };
}
