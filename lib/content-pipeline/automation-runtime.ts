import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SupabaseContentAutomationStore } from "@/lib/content-pipeline/automation-supabase";
import { SupabaseGuidePublishStore } from "@/lib/content-pipeline/supabase-publish-store";
import { loadLivePipelineContext } from "@/lib/content-pipeline/live-context";
import type { CreateAutomationRuntime } from "@/lib/content-pipeline/automation-request";

export const createLiveContentAutomationRuntime: CreateAutomationRuntime = async () => {
  const client = createSupabaseAdminClient();
  const store = new SupabaseContentAutomationStore(client);
  const publishStore = new SupabaseGuidePublishStore(client);
  return {
    store,
    publishStore,
    loadContext: () => loadLivePipelineContext(client),
  };
};
