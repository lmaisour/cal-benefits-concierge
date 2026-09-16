import { getDraftProviderId, getOpenAiDraftConfig } from "@/lib/content-pipeline/config";
import { FakeContentDraftProvider } from "@/lib/content-pipeline/generate-draft";
import { LlmDraftProviderError } from "@/lib/content-pipeline/compose-selected-claims";
import { OpenAiClaimDraftProvider } from "@/lib/content-pipeline/llm-provider";
import type { ContentDraftProvider } from "@/lib/content-pipeline/types";

export function createContentDraftProvider(
  providerId = getDraftProviderId(),
): ContentDraftProvider {
  const id = providerId.trim().toLowerCase() || "fake";
  if (id === "fake") {
    return new FakeContentDraftProvider();
  }
  if (id === "openai") {
    const config = getOpenAiDraftConfig();
    if (!config.apiKey) {
      throw new LlmDraftProviderError(
        "MISSING_API_KEY",
        "OpenAI draft provider is selected but no server-side API key is configured.",
      );
    }
    return new OpenAiClaimDraftProvider({ config });
  }
  throw new LlmDraftProviderError(
    "INVALID_PROVIDER",
    `Draft provider "${providerId}" is not supported. Use fake or openai.`,
  );
}
