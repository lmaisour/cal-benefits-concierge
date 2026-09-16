import { randomUUID } from "node:crypto";
import {
  composeDraftFromSelectedClaimIds,
  LlmDraftProviderError,
  parseClaimSelection,
  sanitizeProviderMessage,
} from "@/lib/content-pipeline/compose-selected-claims";
import { getOpenAiDraftConfig, type OpenAiDraftConfig } from "@/lib/content-pipeline/config";
import { buildFactualClaims } from "@/lib/content-pipeline/generate-draft";
import { buildLlmSystemPrompt, buildLlmUserPrompt } from "@/lib/content-pipeline/llm-prompt";
import {
  LLM_CLAIM_SELECTION_SCHEMA,
  LLM_CLAIM_SELECTION_SCHEMA_NAME,
} from "@/lib/content-pipeline/llm-schema";
import type {
  ContentDraft,
  ContentDraftProvider,
  EvidencePackage,
  ProviderMetadata,
  ScoredOpportunity,
} from "@/lib/content-pipeline/types";

export type LlmFetch = (
  input: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  },
) => Promise<Response>;

export type OpenAiClaimDraftProviderOptions = {
  config?: OpenAiDraftConfig;
  fetchImpl?: LlmFetch;
};

type ResponsesApiJson = {
  id?: string;
  model?: string;
  status?: string | null;
  error?: { message?: string; code?: string } | null;
  incomplete_details?: { reason?: string | null } | null;
  output_text?: string | null;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === "AbortError") ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name: string }).name === "AbortError")
  );
}

function retryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function headerValue(headers: Headers, name: string): string | null {
  return headers.get(name);
}

function metadataFromResponse(
  config: OpenAiDraftConfig,
  json: ResponsesApiJson,
  requestId: string | null,
  clientRequestId: string,
): Omit<ProviderMetadata, "provider" | "mode"> {
  const usage = json.usage;
  const inputTokens = usage?.input_tokens ?? null;
  const outputTokens = usage?.output_tokens ?? null;
  const totalTokens =
    usage?.total_tokens ??
    (inputTokens != null && outputTokens != null ? inputTokens + outputTokens : null);
  const status = json.status ?? null;
  const incompleteReason = json.incomplete_details?.reason ?? null;
  return {
    model: json.model ?? config.model,
    request_id: requestId,
    response_id: json.id ?? null,
    client_request_id: clientRequestId,
    status,
    incomplete_reason: incompleteReason,
    finish_reason: incompleteReason ?? status,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
    },
  };
}

function collectRefusal(json: ResponsesApiJson): string | null {
  for (const item of json.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "refusal" && content.refusal?.trim()) {
        return content.refusal.trim();
      }
    }
  }
  return null;
}

function collectOutputText(json: ResponsesApiJson): string {
  if (typeof json.output_text === "string" && json.output_text.trim().length > 0) {
    return json.output_text;
  }
  const parts: string[] = [];
  for (const item of json.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) {
        parts.push(content.text);
      }
    }
  }
  return parts.join("");
}

function parseStructuredPayload(json: ResponsesApiJson, apiKey: string): unknown {
  const status = json.status?.trim() || null;
  if (status && status !== "completed") {
    if (status === "incomplete") {
      throw new LlmDraftProviderError(
        "INCOMPLETE_RESPONSE",
        "Draft provider returned an incomplete Responses API result.",
      );
    }
    throw new LlmDraftProviderError(
      "PROVIDER_HTTP",
      sanitizeProviderMessage(
        json.error?.message || `OpenAI response status ${status}.`,
        apiKey,
      ),
    );
  }

  const refusal = collectRefusal(json);
  if (refusal) {
    throw new LlmDraftProviderError(
      "REFUSED",
      sanitizeProviderMessage(refusal, apiKey),
    );
  }

  if (json.error?.message) {
    throw new LlmDraftProviderError(
      "PROVIDER_HTTP",
      sanitizeProviderMessage(json.error.message, apiKey),
    );
  }

  const text = collectOutputText(json);
  if (!text.trim()) {
    throw new LlmDraftProviderError(
      "MALFORMED_OUTPUT",
      "Draft provider returned no structured output.",
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new LlmDraftProviderError(
      "MALFORMED_OUTPUT",
      "Draft provider returned non-JSON content.",
    );
  }
}

export class OpenAiClaimDraftProvider implements ContentDraftProvider {
  readonly id = "openai";
  private metadata: Omit<ProviderMetadata, "provider" | "mode"> | null = null;
  private readonly config: OpenAiDraftConfig;
  private readonly fetchImpl: LlmFetch;

  constructor(options: OpenAiClaimDraftProviderOptions = {}) {
    this.config = options.config ?? getOpenAiDraftConfig();
    this.fetchImpl =
      options.fetchImpl ??
      (async (input, init) => fetch(input, init));
  }

  takeMetadata(): Omit<ProviderMetadata, "provider" | "mode"> | null {
    const value = this.metadata;
    this.metadata = null;
    return value;
  }

  async generateDraft(input: {
    evidence: EvidencePackage;
    opportunity: ScoredOpportunity;
  }): Promise<ContentDraft> {
    if (!this.config.apiKey) {
      throw new LlmDraftProviderError(
        "MISSING_API_KEY",
        "OpenAI draft provider is selected but no server-side API key is configured.",
      );
    }

    const allowed = buildFactualClaims(input.evidence);
    // gpt-5.6-luna rejects non-default temperature on the Responses API.
    // Structured json_schema already constrains output, so temperature is omitted.
    const body = {
      model: this.config.model,
      store: false,
      max_output_tokens: this.config.maxOutputTokens,
      instructions: buildLlmSystemPrompt(),
      input: [
        {
          role: "user",
          content: buildLlmUserPrompt({
            evidence: input.evidence,
            allowedClaims: allowed,
            proposedTitle: input.opportunity.proposed_title,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: LLM_CLAIM_SELECTION_SCHEMA_NAME,
          strict: true,
          schema: LLM_CLAIM_SELECTION_SCHEMA,
        },
      },
    };

    const json = await this.request(body);
    const parsed = parseStructuredPayload(json, this.config.apiKey);
    const selection = parseClaimSelection(parsed);
    return composeDraftFromSelectedClaimIds(
      selection,
      allowed,
      input.evidence,
      input.opportunity,
    );
  }

  private async request(body: unknown): Promise<ResponsesApiJson> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
      const clientRequestId = randomUUID();
      try {
        const response = await this.fetchImpl(`${this.config.baseUrl}/responses`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
            "X-Client-Request-Id": clientRequestId,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        const requestId =
          headerValue(response.headers, "openai-request-id") ??
          headerValue(response.headers, "x-request-id");
        const json = (await response.json().catch(() => ({}))) as ResponsesApiJson;
        this.metadata = metadataFromResponse(
          this.config,
          json,
          requestId,
          clientRequestId,
        );
        if (!response.ok) {
          const message = sanitizeProviderMessage(
            json.error?.message || `OpenAI HTTP ${response.status}`,
            this.config.apiKey,
          );
          if (retryableStatus(response.status) && attempt < this.config.maxRetries) {
            lastError = new LlmDraftProviderError("PROVIDER_HTTP", message);
            await sleep(Math.min(2000, 200 * 2 ** attempt));
            continue;
          }
          throw new LlmDraftProviderError("PROVIDER_HTTP", message);
        }
        return json;
      } catch (error) {
        if (error instanceof LlmDraftProviderError) {
          throw error;
        }
        if (isAbortError(error)) {
          throw new LlmDraftProviderError(
            "TIMEOUT",
            `OpenAI draft provider timed out after ${this.config.timeoutMs}ms.`,
          );
        }
        lastError =
          error instanceof Error
            ? new LlmDraftProviderError(
                "PROVIDER_HTTP",
                sanitizeProviderMessage(error.message, this.config.apiKey),
              )
            : new LlmDraftProviderError("PROVIDER_HTTP", "OpenAI draft provider failed.");
        if (attempt < this.config.maxRetries) {
          await sleep(Math.min(2000, 200 * 2 ** attempt));
          continue;
        }
        throw lastError;
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError ?? new LlmDraftProviderError("PROVIDER_HTTP", "OpenAI draft provider failed.");
  }
}
