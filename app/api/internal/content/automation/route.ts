import { handleContentAutomationRequest } from "@/lib/content-pipeline/automation-request";
import { createLiveContentAutomationRuntime } from "@/lib/content-pipeline/automation-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleContentAutomationRequest(request, createLiveContentAutomationRuntime);
}
