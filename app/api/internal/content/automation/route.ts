import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleContentAutomationRequest } from "@/lib/content-pipeline/automation-request";
import { SupabaseContentAutomationStore } from "@/lib/content-pipeline/automation-supabase";
import { SupabaseGuidePublishStore } from "@/lib/content-pipeline/supabase-publish-store";
import { loadLivePipelineContext } from "@/lib/content-pipeline/live-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleContentAutomationRequest(request, async () => {
    const client = createSupabaseAdminClient();
    const store = new SupabaseContentAutomationStore(client);
    const publishStore = new SupabaseGuidePublishStore(client);
    return {
      store,
      publishStore,
      loadContext: () => loadLivePipelineContext(client),
    };
  });
}
