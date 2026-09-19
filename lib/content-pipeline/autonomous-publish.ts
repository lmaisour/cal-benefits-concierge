import {
  getDraftProviderId,
  isAutoPublishEnabled,
  isContentPipelinePublishEnabled,
} from "@/lib/content-pipeline/config";
import {
  AUTOMATION_CADENCE_MS,
  AutomationError,
} from "@/lib/content-pipeline/automation-types";
import type {
  AutomationErrorCode,
  AutomationScheduleState,
} from "@/lib/content-pipeline/automation-types";
import type { ContentAutomationStore } from "@/lib/content-pipeline/automation-store";
import type { GuidePublishStore, PublishedGuideRecord } from "@/lib/content-pipeline/publish-store";
import { PublishGuideError } from "@/lib/content-pipeline/publish-guide";
import type {
  ContentOpportunityRecord,
  ContentPipelineRunRecord,
} from "@/lib/content-pipeline/types";

export const AUTONOMOUS_DRAFT_PROVIDER_ID = "openai" as const;

export const PRODUCTION_BAR_GUIDE_ID = "426de613-e070-4a05-8eb5-b274f76d350e";
export const PRODUCTION_BAR_PROGRAM_ID = "ff7a190d-c5a9-494b-9182-6048b91104dd";
export const PRODUCTION_BAR_SLUG = "bar-vehicle-retirement";

export type UnreconciledPublication = {
  guide: PublishedGuideRecord;
  opportunity_id: string;
  program_id: string | null;
  pipeline_run_id: string | null;
};

export function assertAutonomousPublishGates(providerId?: string): void {
  if (!isAutoPublishEnabled()) {
    throw new AutomationError(
      "automation_publish_disabled",
      "Autonomous publication is disabled.",
    );
  }
  if (!isContentPipelinePublishEnabled()) {
    throw new AutomationError(
      "publish_disabled",
      "Content pipeline publication is disabled.",
    );
  }
  const configured = getDraftProviderId();
  if (configured !== AUTONOMOUS_DRAFT_PROVIDER_ID) {
    throw new AutomationError(
      "invalid_provider",
      "Autonomous publication requires the explicitly configured OpenAI draft provider.",
    );
  }
  if (providerId && providerId !== AUTONOMOUS_DRAFT_PROVIDER_ID) {
    throw new AutomationError(
      "invalid_provider",
      "Autonomous publication requires the explicitly configured OpenAI draft provider.",
    );
  }
}

export function nextPublishAtFrom(publishedAt: string): string {
  return new Date(new Date(publishedAt).getTime() + AUTOMATION_CADENCE_MS).toISOString();
}

export function isProtectedPublishedGuide(guide: Pick<PublishedGuideRecord, "id" | "slug">): boolean {
  return guide.id === PRODUCTION_BAR_GUIDE_ID || guide.slug === PRODUCTION_BAR_SLUG;
}

export function mapPublishFailureCode(error: unknown): AutomationErrorCode {
  if (error instanceof AutomationError) {
    return error.code;
  }
  if (error instanceof PublishGuideError) {
    if (error.code === "publish_disabled") {
      return "publish_disabled";
    }
    if (error.code === "identity_mismatch") {
      return "identity_mismatch";
    }
    if (error.code === "validation_failed" || error.code === "blocking_validation_error") {
      return "validation_failed";
    }
    return "publish_failed";
  }
  return "publish_failed";
}

export function assertPublishIdentity(input: {
  run: ContentPipelineRunRecord;
  opportunity: ContentOpportunityRecord;
  executionRunId: string | null;
  executionOpportunityId: string | null;
  executionProgramId: string | null;
}): void {
  if (input.run.id !== input.executionRunId) {
    throw new AutomationError(
      "identity_mismatch",
      "Execution pipeline run identity does not match the generated run.",
    );
  }
  if (!input.run.opportunity_id || input.run.opportunity_id !== input.opportunity.id) {
    throw new AutomationError(
      "identity_mismatch",
      "Pipeline run opportunity identity is inconsistent.",
    );
  }
  if (input.executionOpportunityId && input.executionOpportunityId !== input.opportunity.id) {
    throw new AutomationError(
      "identity_mismatch",
      "Execution opportunity identity does not match the generated opportunity.",
    );
  }
  if (input.executionProgramId && input.executionProgramId !== input.opportunity.program_id) {
    throw new AutomationError(
      "identity_mismatch",
      "Execution program identity does not match the generated opportunity.",
    );
  }
  if (input.run.evidence_snapshot?.program_id !== input.opportunity.program_id) {
    throw new AutomationError(
      "identity_mismatch",
      "Opportunity program does not match the evidence snapshot.",
    );
  }
}

export function assertValidationStillPasses(run: ContentPipelineRunRecord): void {
  const validation = run.validation_snapshot;
  if (!validation?.passed || validation.errors.length > 0) {
    throw new AutomationError("validation_failed", "Validated draft did not pass.");
  }
}

export async function findUnreconciledPublication(input: {
  store: ContentAutomationStore;
  publishStore: GuidePublishStore;
  schedule: AutomationScheduleState;
  currentExecutionId: string;
}): Promise<UnreconciledPublication | null> {
  const last = input.schedule.last_successful_publish_at
    ? new Date(input.schedule.last_successful_publish_at).getTime()
    : null;
  const executions = await input.store.listExecutions();
  const ordered = [...executions].sort((left, right) =>
    right.started_at.localeCompare(left.started_at),
  );

  for (const execution of ordered) {
    if (execution.id === input.currentExecutionId) {
      continue;
    }
    if (!execution.opportunity_id && !execution.guide_id) {
      continue;
    }
    const opportunity = execution.opportunity_id
      ? await input.store.pipeline.getOpportunity(execution.opportunity_id)
      : null;
    const guideId = opportunity?.guide_id ?? execution.guide_id;
    if (!guideId) {
      continue;
    }
    const guide = await input.publishStore.getGuide(guideId);
    if (!guide?.published || !guide.published_at) {
      continue;
    }
    if (isProtectedPublishedGuide(guide)) {
      continue;
    }
    if (opportunity?.program_id === PRODUCTION_BAR_PROGRAM_ID) {
      continue;
    }
    const publishedAtMs = new Date(guide.published_at).getTime();
    if (last != null && publishedAtMs <= last) {
      continue;
    }
    return {
      guide,
      opportunity_id: opportunity?.id ?? execution.opportunity_id ?? "",
      program_id: opportunity?.program_id ?? execution.program_id,
      pipeline_run_id: execution.pipeline_run_id,
    };
  }
  return null;
}
