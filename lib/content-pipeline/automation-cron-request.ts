import { authorizeContentAutomationCronRequest } from "@/lib/content-pipeline/automation-cron-auth";
import {
  automationAuthFailureResponse,
  automationCaughtErrorResponse,
  automationResultResponse,
  executeContentAutomation,
  type CreateAutomationRuntime,
} from "@/lib/content-pipeline/automation-request";

export async function handleContentAutomationCronRequest(
  request: Request,
  createRuntime: CreateAutomationRuntime,
): Promise<Response> {
  const auth = authorizeContentAutomationCronRequest(request);
  if (!auth.ok) {
    return automationAuthFailureResponse(auth);
  }

  try {
    const result = await executeContentAutomation(createRuntime, "CRON");
    return automationResultResponse(result);
  } catch (error) {
    return automationCaughtErrorResponse(error);
  }
}
