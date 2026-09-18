import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleContentPipelinePublishRequest } from "@/lib/content-pipeline/publish-request";
import { SupabaseGuidePublishStore } from "@/lib/content-pipeline/supabase-publish-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleContentPipelinePublishRequest(request, async () => {
    return new SupabaseGuidePublishStore(createSupabaseAdminClient());
  });
}
