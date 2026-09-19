import { authorizeContentAutomationRequest } from "@/lib/content-pipeline/automation-auth";
import { getContentAutomationLeaseSeconds } from "@/lib/content-pipeline/automation-config";
import { runContentAutomation } from "@/lib/content-pipeline/run-automation";
import type { ContentAutomationResult } from "@/lib/content-pipeline/run-automation";
import { AutomationError } from "@/lib/content-pipeline/automation-types";
import type { AutomationTrigger } from "@/lib/content-pipeline/automation-types";
import type { ContentAutomationStore } from "@/lib/content-pipeline/automation-store";
import type { GuidePublishStore } from "@/lib/content-pipeline/publish-store";
import type { PipelineCatalogContext } from "@/lib/content-pipeline/types";
import type { ContentDraftProvider } from "@/lib/content-pipeline/types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type CreateAutomationRuntime = () => Promise<{
  store: ContentAutomationStore;
  loadContext: () => Promise<PipelineCatalogContext>;
  provider?: ContentDraftProvider;
  publishStore?: GuidePublishStore;
}>;

const ERROR_STATUS: Record<string, number> = {
  automation_disabled: 403,
  automation_unauthorized: 401,
  invalid_provider: 500,
};

export function automationAuthFailureResponse(
  auth: { status: 401 | 403; error: string },
): Response {
  return Response.json(
    { error: auth.error, publish_attempted: false, publish_succeeded: false },
    { status: auth.status },
  );
}

export function automationResultResponse(result: ContentAutomationResult): Response {
  return Response.json({
    status: result.execution.status,
    execution_id: result.execution.id,
    due: result.due,
    run_id: result.execution.pipeline_run_id,
    opportunity_id: result.execution.opportunity_id,
    program_id: result.execution.program_id,
    provider: result.execution.provider,
    publish_attempted: result.publish_attempted,
    publish_succeeded: result.publish_succeeded,
    guide_id: result.execution.guide_id,
    published_at: result.execution.published_at,
    error: result.execution.error_code,
  });
}

export function automationCaughtErrorResponse(error: unknown): Response {
  if (error instanceof AutomationError && ERROR_STATUS[error.code]) {
    return Response.json(
      { error: error.code, publish_attempted: false, publish_succeeded: false },
      { status: ERROR_STATUS[error.code] },
    );
  }
  console.error("content_automation_failed", error);
  return Response.json(
    {
      error: "content_automation_failed",
      publish_attempted: false,
      publish_succeeded: false,
    },
    { status: 500 },
  );
}

export async function executeContentAutomation(
  createRuntime: CreateAutomationRuntime,
  trigger: AutomationTrigger,
): Promise<ContentAutomationResult> {
  const runtime = await createRuntime();
  return runContentAutomation({
    store: runtime.store,
    loadContext: runtime.loadContext,
    provider: runtime.provider,
    publishStore: runtime.publishStore,
    trigger,
    leaseSeconds: getContentAutomationLeaseSeconds(),
  });
}

export async function handleContentAutomationRequest(
  request: Request,
  createRuntime: CreateAutomationRuntime,
): Promise<Response> {
  const auth = authorizeContentAutomationRequest(request);
  if (!auth.ok) {
    return automationAuthFailureResponse(auth);
  }

  let trigger: AutomationTrigger = "MANUAL";
  try {
    const body: unknown = await request.json();
    if (isPlainObject(body) && body.trigger === "CRON") {
      trigger = "CRON";
    }
  } catch {
    trigger = "MANUAL";
  }

  try {
    const result = await executeContentAutomation(createRuntime, trigger);
    return automationResultResponse(result);
  } catch (error) {
    return automationCaughtErrorResponse(error);
  }
}
