import { handleContentPipelineDryRunRequest } from "@/lib/content-pipeline/dry-run-request";
import { createLivePipelineRuntime } from "@/lib/content-pipeline/live-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleContentPipelineDryRunRequest(request, createLivePipelineRuntime);
}
