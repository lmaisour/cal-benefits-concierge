import { createContentDraftProvider } from "@/lib/content-pipeline/create-draft-provider";
import { getDraftProviderId } from "@/lib/content-pipeline/config";
import { sanitizeProviderMessage } from "@/lib/content-pipeline/compose-selected-claims";
import { runDryRunContentPipeline } from "@/lib/content-pipeline/run-pipeline";
import {
  assertAutonomousPublicationEligible,
  fingerprintAuthoritativeState,
} from "@/lib/content-pipeline/automation-fingerprint";
import { withTransientRetries, type RetrySleep } from "@/lib/content-pipeline/automation-retry";
import {
  AUTOMATION_CADENCE_MS,
  AUTOMATION_LOCK_KEY,
  AutomationError,
} from "@/lib/content-pipeline/automation-types";
import type {
  AutomationErrorCode,
  AutomationExecutionRecord,
  AutomationStatus,
  AutomationTrigger,
} from "@/lib/content-pipeline/automation-types";
import type { ContentAutomationStore } from "@/lib/content-pipeline/automation-store";
import type {
  ContentDraftProvider,
  DiscoveryRecord,
  PipelineCatalogContext,
} from "@/lib/content-pipeline/types";

export type RunContentAutomationInput = {
  store: ContentAutomationStore;
  loadContext: () => Promise<PipelineCatalogContext>;
  provider?: ContentDraftProvider;
  now?: Date;
  trigger?: AutomationTrigger;
  leaseSeconds: number;
  sleep?: RetrySleep;
  random?: () => number;
};

export type ContentAutomationResult = {
  execution: AutomationExecutionRecord;
  due: boolean;
  publish_attempted: false;
  publish_succeeded: false;
};

function completeAt(now: Date): string {
  return now.toISOString();
}

function recordByProgram(
  records: DiscoveryRecord[],
  programId: string | null | undefined,
): DiscoveryRecord | null {
  if (!programId) {
    return null;
  }
  return records.find((record) => record.program_id === programId) ?? null;
}

export function isCycleDue(nextPublishAt: string, now: Date): boolean {
  return new Date(nextPublishAt).getTime() <= now.getTime();
}

export function nextPublishAfter(publishedAt: Date): Date {
  return new Date(publishedAt.getTime() + AUTOMATION_CADENCE_MS);
}

export async function runContentAutomation(
  input: RunContentAutomationInput,
): Promise<ContentAutomationResult> {
  const now = input.now ?? new Date();
  const trigger = input.trigger ?? "MANUAL";
  const ownerId = crypto.randomUUID();
  const executionId = crypto.randomUUID();
  let provider: ContentDraftProvider;
  try {
    provider = input.provider ?? createContentDraftProvider(getDraftProviderId());
  } catch (error) {
    throw new AutomationError(
      "invalid_provider",
      error instanceof Error ? error.message : "Draft provider configuration is invalid.",
    );
  }

  let execution = await input.store.createExecution({
    id: executionId,
    started_at: now.toISOString(),
    trigger,
    lock_owner: ownerId,
    provider: provider.id,
  });

  const finish = async (
    status: AutomationStatus,
    patch: Partial<AutomationExecutionRecord> = {},
  ): Promise<ContentAutomationResult> => {
    const nextPatch: Partial<AutomationExecutionRecord> = {
      ...patch,
      status,
      completed_at: patch.completed_at ?? completeAt(new Date()),
      publish_attempted: false,
      publish_succeeded: false,
    };
    if (patch.error_message === undefined) {
      delete nextPatch.error_message;
    } else if (patch.error_message !== null) {
      nextPatch.error_message = sanitizeProviderMessage(patch.error_message);
    }
    execution = await input.store.updateExecution(execution.id, nextPatch);
    return {
      execution,
      due: Boolean(execution.due),
      publish_attempted: false,
      publish_succeeded: false,
    };
  };

  const lock = await input.store.acquireLock({
    lockKey: AUTOMATION_LOCK_KEY,
    ownerId,
    leaseSeconds: input.leaseSeconds,
    now,
  });
  if (!lock.acquired) {
    return finish("LOCKED", {
      due: null,
      lock_owner: ownerId,
      error_code: "locked",
      error_message: "Another content automation cycle holds the lease.",
    });
  }

  try {
    const schedule = await input.store.getSchedule();
    const due = isCycleDue(schedule.next_publish_at, now);
    execution = await input.store.updateExecution(execution.id, { due, lock_owner: ownerId });
    if (!due) {
      return finish("NOT_DUE", {
        due: false,
        error_code: "not_due",
        error_message: "Publication cadence is not due.",
      });
    }

    let loadAttempts = 0;
    const loaded = await withTransientRetries(input.loadContext, {
      sleep: input.sleep,
      random: input.random,
    }).then((result) => {
      loadAttempts = result.attempts;
      return result.value;
    });
    execution = await input.store.updateExecution(execution.id, {
      attempt_count: loadAttempts,
    });

    const publishedProgramIds = await input.store.listPublishedProgramIds();
    const pipeline = await runDryRunContentPipeline({
      context: loaded,
      provider,
      store: input.store.pipeline,
      now,
      publishedProgramIds,
    });

    const opportunity = pipeline.opportunity;
    const programId = opportunity?.program_id ?? null;
    const generationRecord = recordByProgram(loaded.records, programId);
    const generationFingerprint =
      pipeline.run.authoritative_state_fingerprint ??
      (generationRecord ? fingerprintAuthoritativeState(generationRecord) : null);

    if (pipeline.run.id && generationFingerprint && !pipeline.run.authoritative_state_fingerprint) {
      await input.store.pipeline.updateRun(pipeline.run.id, {
        evidence_snapshot: pipeline.evidence
          ? { ...pipeline.evidence, authoritative_state_fingerprint: generationFingerprint }
          : pipeline.evidence,
        authoritative_state_fingerprint: generationFingerprint,
      });
    }

    const draftsGenerated = pipeline.draft ? 1 : 0;
    execution = await input.store.updateExecution(execution.id, {
      status: pipeline.draft ? "GENERATED" : execution.status,
      pipeline_run_id: pipeline.run.id,
      opportunity_id: opportunity?.id ?? null,
      program_id: programId,
      drafts_generated: draftsGenerated,
      validation_passed: pipeline.validation?.passed ?? null,
      authoritative_state_fingerprint: generationFingerprint,
      provider_usage: pipeline.run.provider_metadata,
      attempt_count: loadAttempts,
    });

    if (pipeline.run.status === "ERROR") {
      return finish("ERROR", {
        error_code: "generation_failed",
        error_message: pipeline.run.error_message ?? "Draft generation failed.",
      });
    }
    if (!opportunity || !pipeline.draft) {
      return finish("BLOCKED", {
        error_code: "no_candidate",
        error_message: pipeline.run.selected_reason ?? "No unpublished program guide candidate remained.",
      });
    }
    if (!pipeline.validation?.passed || pipeline.validation.errors.length > 0) {
      return finish("BLOCKED", {
        error_code: "validation_failed",
        error_message: "Validated draft did not pass.",
      });
    }
    if (!generationFingerprint) {
      return finish("BLOCKED", {
        error_code: "missing_authoritative_fingerprint",
        error_message: "Generated run is missing an authoritative fingerprint.",
      });
    }

    const currentContext = await withTransientRetries(input.loadContext, {
      sleep: input.sleep,
      random: input.random,
    }).then((result) => result.value);
    const currentRecord = recordByProgram(currentContext.records, programId);
    const currentFingerprint = currentRecord
      ? fingerprintAuthoritativeState(currentRecord)
      : null;
    try {
      assertAutonomousPublicationEligible(generationFingerprint, currentFingerprint);
    } catch (error) {
      const code =
        error instanceof AutomationError ? error.code : "stale_authoritative_state";
      return finish("BLOCKED", {
        error_code: code,
        error_message: error instanceof Error ? error.message : "Authoritative state is stale.",
      });
    }

    return finish("COMPLETED_DRY_RUN", {
      due: true,
      error_code: null,
      error_message: null,
    });
  } catch (error) {
    const code: AutomationErrorCode =
      error instanceof AutomationError ? error.code : "generation_failed";
    return finish("ERROR", {
      error_code: code,
      error_message: error instanceof Error ? error.message : "Content automation failed.",
    });
  } finally {
    await input.store.releaseLock(AUTOMATION_LOCK_KEY, ownerId);
  }
}
