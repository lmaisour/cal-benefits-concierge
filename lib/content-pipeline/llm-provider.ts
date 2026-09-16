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

type ChatCompletionResponse = {
  id?: string;
  model?: string;
  choices?: Array<{
    finish_reason?: string | null;
    message?: { content?: string | null };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: { message?: string };
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

function metadataFromResponse(
  config: OpenAiDraftConfig,
  json: ChatCompletionResponse,
  requestId: string | null,
): Omit<ProviderMetadata, "provider" | "mode"> {
  const usage = json.usage;
  const inputTokens = usage?.prompt_tokens ?? usage?.input_tokens ?? null;
  const outputTokens = usage?.completion_tokens ?? usage?.output_tokens ?? null;
  const totalTokens =
    usage?.total_tokens ??
    (inputTokens != null && outputTokens != null ? inputTokens + outputTokens : null);
  return {
    model: json.model ?? config.model,
    request_id: requestId,
    finish_reason: json.choices?.[0]?.finish_reason ?? null,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
    },
  };
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
    const body = {
      model: this.config.model,
      temperature: 0,
      max_tokens: this.config.maxOutputTokens,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: LLM_CLAIM_SELECTION_SCHEMA_NAME,
          strict: true,
          schema: LLM_CLAIM_SELECTION_SCHEMA,
        },
      },
      messages: [
        { role: "system", content: buildLlmSystemPrompt() },
        {
          role: "user",
          content: buildLlmUserPrompt({
            evidence: input.evidence,
            allowedClaims: allowed,
            proposedTitle: input.opportunity.proposed_title,
          }),
        },
      ],
    };

    const json = await this.request(body);
    const content = json.choices?.[0]?.message?.content;
    let parsed: unknown;
    try {
      parsed = JSON.parse(content ?? "");
    } catch {
      throw new LlmDraftProviderError(
        "MALFORMED_OUTPUT",
        "Draft provider returned non-JSON content.",
      );
    }
    const selection = parseClaimSelection(parsed);
    return composeDraftFromSelectedClaimIds(
      selection,
      allowed,
      input.evidence,
      input.opportunity,
    );
  }

  private async request(body: unknown): Promise<ChatCompletionResponse> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
        const response = await this.fetchImpl(`${this.config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        const requestId = response.headers.get("x-request-id");
        const json = (await response.json().catch(() => ({}))) as ChatCompletionResponse;
        this.metadata = metadataFromResponse(this.config, json, requestId);
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
