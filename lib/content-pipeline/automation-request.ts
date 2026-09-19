import { authorizeContentAutomationRequest } from "@/lib/content-pipeline/automation-auth";
import { getContentAutomationLeaseSeconds } from "@/lib/content-pipeline/automation-config";
import { runContentAutomation } from "@/lib/content-pipeline/run-automation";
import { AutomationError } from "@/lib/content-pipeline/automation-types";
import type { AutomationTrigger } from "@/lib/content-pipeline/automation-types";
import type { ContentAutomationStore } from "@/lib/content-pipeline/automation-store";
import type { PipelineCatalogContext } from "@/lib/content-pipeline/types";
import type { ContentDraftProvider } from "@/lib/content-pipeline/types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type CreateAutomationRuntime = () => Promise<{
  store: ContentAutomationStore;
  loadContext: () => Promise<PipelineCatalogContext>;
  provider?: ContentDraftProvider;
}>;

const ERROR_STATUS: Record<string, number> = {
  automation_disabled: 403,
  automation_unauthorized: 401,
};

export async function handleContentAutomationRequest(
  request: Request,
  createRuntime: CreateAutomationRuntime,
): Promise<Response> {
  const auth = authorizeContentAutomationRequest(request);
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, publish_attempted: false, publish_succeeded: false },
      { status: auth.status },
    );
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
    const runtime = await createRuntime();
    const result = await runContentAutomation({
      store: runtime.store,
      loadContext: runtime.loadContext,
      provider: runtime.provider,
      trigger,
      leaseSeconds: getContentAutomationLeaseSeconds(),
    });
    return Response.json({
      status: result.execution.status,
      execution_id: result.execution.id,
      due: result.due,
      run_id: result.execution.pipeline_run_id,
      opportunity_id: result.execution.opportunity_id,
      program_id: result.execution.program_id,
      provider: result.execution.provider,
      publish_attempted: false,
      publish_succeeded: false,
      error: result.execution.error_code,
    });
  } catch (error) {
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
}
