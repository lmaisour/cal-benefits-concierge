import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getDraftProviderId } from "@/lib/content-pipeline/config";
import { createContentDraftProvider } from "@/lib/content-pipeline/create-draft-provider";
import { loadLivePipelineContext, LivePipelineLoadError } from "@/lib/content-pipeline/live-context";
import { newRunId } from "@/lib/content-pipeline/ids";
import { SupabaseContentPipelineStore } from "@/lib/content-pipeline/supabase-store";
import type { ContentDraftProvider, PipelineCatalogContext } from "@/lib/content-pipeline/types";
import type { ContentPipelineStore } from "@/lib/content-pipeline/store";

export type PipelineRuntime = {
  context: PipelineCatalogContext;
  store: ContentPipelineStore;
  provider: ContentDraftProvider;
};

export async function createLivePipelineRuntime(): Promise<PipelineRuntime> {
  let store: SupabaseContentPipelineStore | null = null;
  try {
    const client = createSupabaseAdminClient();
    store = new SupabaseContentPipelineStore(client);
    const context = await loadLivePipelineContext(client);
    return {
      context,
      store,
      provider: createContentDraftProvider(getDraftProviderId()),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load live content pipeline data.";
    if (store) {
      try {
        const run = await store.createRun({
          id: newRunId(),
          started_at: new Date().toISOString(),
        });
        await store.updateRun(run.id, {
          status: "ERROR",
          error_message: message,
          completed_at: new Date().toISOString(),
        });
      } catch {
        // Recording the failed run is best-effort when pipeline tables are missing.
      }
    }
    throw new LivePipelineLoadError(message);
  }
}
