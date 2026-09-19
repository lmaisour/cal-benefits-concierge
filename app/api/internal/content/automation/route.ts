import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleContentAutomationRequest } from "@/lib/content-pipeline/automation-request";
import { SupabaseContentAutomationStore } from "@/lib/content-pipeline/automation-supabase";
import { loadLivePipelineContext } from "@/lib/content-pipeline/live-context";
import { createContentDraftProvider } from "@/lib/content-pipeline/create-draft-provider";
import { getDraftProviderId } from "@/lib/content-pipeline/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleContentAutomationRequest(request, async () => {
    const client = createSupabaseAdminClient();
    const store = new SupabaseContentAutomationStore(client);
    return {
      store,
      loadContext: () => loadLivePipelineContext(client),
      provider: createContentDraftProvider(getDraftProviderId()),
    };
  });
}
