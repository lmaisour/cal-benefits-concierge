import { handleContentPipelineDryRunRequest } from "@/lib/content-pipeline/dry-run-request";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleContentPipelineDryRunRequest(request);
}
