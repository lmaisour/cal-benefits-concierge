import { handleContentAutomationCronRequest } from "@/lib/content-pipeline/automation-cron-request";
import { createLiveContentAutomationRuntime } from "@/lib/content-pipeline/automation-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  return handleContentAutomationCronRequest(request, createLiveContentAutomationRuntime);
}
