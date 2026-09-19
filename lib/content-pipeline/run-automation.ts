import { createContentDraftProvider } from "@/lib/content-pipeline/create-draft-provider";
import {
  getDraftProviderId,
  isAutoPublishEnabled,
  isContentPipelinePublishEnabled,
} from "@/lib/content-pipeline/config";
import { sanitizeProviderMessage } from "@/lib/content-pipeline/compose-selected-claims";
import { runDryRunContentPipeline } from "@/lib/content-pipeline/run-pipeline";
import { publishGuide } from "@/lib/content-pipeline/publish-guide";
import {
  assertAutonomousPublicationEligible,
  fingerprintAuthoritativeState,
} from "@/lib/content-pipeline/automation-fingerprint";
import { withTransientRetries, type RetrySleep } from "@/lib/content-pipeline/automation-retry";
import { AutomationLeaseSession } from "@/lib/content-pipeline/automation-lease";
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
import type { GuidePublishStore } from "@/lib/content-pipeline/publish-store";
import {
  PRODUCTION_BAR_PROGRAM_ID,
  assertAutonomousPublishGates,
  assertPublishIdentity,
  assertValidationStillPasses,
  findUnreconciledPublication,
  mapPublishFailureCode,
  nextPublishAtFrom,
  type UnreconciledPublication,
} from "@/lib/content-pipeline/autonomous-publish";
import type {
  ContentDraftProvider,
  DiscoveryRecord,
  PipelineCatalogContext,
} from "@/lib/content-pipeline/types";

export type RunContentAutomationInput = {
  store: ContentAutomationStore;
  loadContext: () => Promise<PipelineCatalogContext>;
  provider?: ContentDraftProvider;
  publishStore?: GuidePublishStore;
  now?: Date;
  trigger?: AutomationTrigger;
  leaseSeconds: number;
  renewEveryMs?: number;
  lockClock?: () => Date;
  sleep?: RetrySleep;
  random?: () => number;
};

export type ContentAutomationResult = {
  execution: AutomationExecutionRecord;
  due: boolean;
  publish_attempted: boolean;
  publish_succeeded: boolean;
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
      publish_attempted: patch.publish_attempted ?? false,
      publish_succeeded: patch.publish_succeeded ?? false,
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
      publish_attempted: execution.publish_attempted,
      publish_succeeded: execution.publish_succeeded,
    };
  };

  const lockClock = input.lockClock ?? (() => new Date());
  const lock = await input.store.acquireLock({
    lockKey: AUTOMATION_LOCK_KEY,
    ownerId,
    leaseSeconds: input.leaseSeconds,
    now: lockClock(),
  });
  if (!lock.acquired) {
    return finish("LOCKED", {
      due: null,
      lock_owner: ownerId,
      error_code: "locked",
      error_message: "Another content automation cycle holds the lease.",
    });
  }

  const lease = new AutomationLeaseSession({
    store: input.store,
    lockKey: AUTOMATION_LOCK_KEY,
    ownerId,
    leaseSeconds: input.leaseSeconds,
    renewEveryMs: input.renewEveryMs,
    clock: lockClock,
  });
  lease.start();

  const recordReconciledPublication = async (
    recovered: UnreconciledPublication,
  ): Promise<ContentAutomationResult> => {
    const publishedAt = recovered.guide.published_at;
    if (!publishedAt) {
      throw new AutomationError(
        "publish_failed",
        "Recovered guide is missing a publication timestamp.",
      );
    }
    await input.store.markSuccessfulPublication(publishedAt, nextPublishAtFrom(publishedAt));
    return finish("RECONCILED", {
      due: true,
      pipeline_run_id: recovered.pipeline_run_id,
      opportunity_id: recovered.opportunity_id || null,
      program_id: recovered.program_id,
      publish_attempted: false,
      publish_succeeded: false,
      guide_id: recovered.guide.id,
      published_at: publishedAt,
      error_code: null,
      error_message: null,
    });
  };

  try {
    await lease.ensureHeld();
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

    const autoPublish = isAutoPublishEnabled();
    if (autoPublish) {
      try {
        assertAutonomousPublishGates(provider.id);
      } catch (error) {
        const code: AutomationErrorCode =
          error instanceof AutomationError ? error.code : "invalid_provider";
        return finish(code === "invalid_provider" ? "ERROR" : "BLOCKED", {
          error_code: code,
          error_message: error instanceof Error ? error.message : "Autonomous publication is blocked.",
        });
      }
      if (!input.publishStore) {
        return finish("ERROR", {
          error_code: "publish_failed",
          error_message: "Autonomous publication requires the existing guide publication store.",
        });
      }
      await lease.ensureHeld();
      const recovered = await findUnreconciledPublication({
        store: input.store,
        publishStore: input.publishStore,
        schedule,
        currentExecutionId: execution.id,
      });
      if (recovered) {
        return recordReconciledPublication(recovered);
      }
    }

    await lease.ensureHeld();
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

    await lease.ensureHeld();
    const publishedProgramIds = await input.store.listPublishedProgramIds();
    const pipeline = await runDryRunContentPipeline({
      context: loaded,
      provider,
      store: input.store.pipeline,
      now,
      publishedProgramIds,
    });

    await lease.ensureHeld();
    const opportunity = pipeline.opportunity;
    const programId = opportunity?.program_id ?? null;
    const generationFingerprint = pipeline.run.authoritative_state_fingerprint ?? null;

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
    if (programId === PRODUCTION_BAR_PROGRAM_ID) {
      return finish("BLOCKED", {
        error_code: "already_published",
        error_message: "The existing BAR guide is excluded from autonomous publication.",
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

    await lease.assertOwned();

    if (!autoPublish) {
      return finish("COMPLETED_DRY_RUN", {
        due: true,
        error_code: null,
        error_message: null,
      });
    }

    const publishStore = input.publishStore;
    if (!publishStore) {
      return finish("ERROR", {
        error_code: "publish_failed",
        error_message: "Autonomous publication requires the existing guide publication store.",
      });
    }

    try {
      assertAutonomousPublishGates(provider.id);
    } catch (error) {
      const code: AutomationErrorCode =
        error instanceof AutomationError ? error.code : "invalid_provider";
      return finish(code === "invalid_provider" ? "ERROR" : "BLOCKED", {
        error_code: code,
        error_message: error instanceof Error ? error.message : "Autonomous publication is blocked.",
      });
    }

    const latestRun = await publishStore.getRun(pipeline.run.id);
    const latestOpportunity = await publishStore.getOpportunity(opportunity.id);
    if (!latestRun || !latestOpportunity) {
      return finish("BLOCKED", {
        error_code: "identity_mismatch",
        error_message: "Generated run or opportunity is no longer available.",
      });
    }
    try {
      assertPublishIdentity({
        run: latestRun,
        opportunity: latestOpportunity,
        executionRunId: execution.pipeline_run_id,
        executionOpportunityId: execution.opportunity_id,
        executionProgramId: execution.program_id,
      });
      assertValidationStillPasses(latestRun);
    } catch (error) {
      const code: AutomationErrorCode =
        error instanceof AutomationError ? error.code : "identity_mismatch";
      return finish("BLOCKED", {
        error_code: code,
        error_message: error instanceof Error ? error.message : "Publication preconditions failed.",
      });
    }

    const stillPublishedIds = await input.store.listPublishedProgramIds();
    if (latestOpportunity.guide_id || stillPublishedIds.includes(latestOpportunity.program_id)) {
      if (latestOpportunity.guide_id) {
        const existingGuide = await publishStore.getGuide(latestOpportunity.guide_id);
        if (existingGuide?.published) {
          return recordReconciledPublication({
            guide: existingGuide,
            opportunity_id: latestOpportunity.id,
            program_id: latestOpportunity.program_id,
            pipeline_run_id: latestRun.id,
          });
        }
      }
      return finish("BLOCKED", {
        error_code: "already_published",
        error_message: "Candidate is already represented by a published guide.",
      });
    }

    const currentAgain = recordByProgram(
      (
        await withTransientRetries(input.loadContext, {
          sleep: input.sleep,
          random: input.random,
        }).then((result) => result.value)
      ).records,
      latestOpportunity.program_id,
    );
    const prePublishFingerprint = currentAgain
      ? fingerprintAuthoritativeState(currentAgain)
      : null;
    try {
      assertAutonomousPublicationEligible(generationFingerprint, prePublishFingerprint);
    } catch (error) {
      const code =
        error instanceof AutomationError ? error.code : "stale_authoritative_state";
      return finish("BLOCKED", {
        error_code: code,
        error_message: error instanceof Error ? error.message : "Authoritative state is stale.",
      });
    }

    await lease.assertOwned();

    execution = await input.store.updateExecution(execution.id, {
      publish_attempted: true,
    });

    const publishTime = input.now ?? new Date();
    let published;
    try {
      published = await publishGuide({
        runId: latestRun.id,
        store: publishStore,
        now: publishTime,
        enabled: isContentPipelinePublishEnabled(),
      });
    } catch (error) {
      return finish("ERROR", {
        publish_attempted: true,
        publish_succeeded: false,
        error_code: mapPublishFailureCode(error),
        error_message: error instanceof Error ? error.message : "Guide publication failed.",
      });
    }

    const publishedAt = published.guide.published_at ?? publishTime.toISOString();
    execution = await input.store.updateExecution(execution.id, {
      publish_attempted: true,
      publish_succeeded: true,
      guide_id: published.guide.id,
      published_at: publishedAt,
    });
    try {
      await input.store.markSuccessfulPublication(publishedAt, nextPublishAtFrom(publishedAt));
    } catch (error) {
      return finish("ERROR", {
        publish_attempted: true,
        publish_succeeded: true,
        guide_id: published.guide.id,
        published_at: publishedAt,
        error_code: mapPublishFailureCode(error),
        error_message:
          error instanceof Error
            ? error.message
            : "Publication succeeded but schedule reconciliation failed.",
      });
    }

    return finish("PUBLISHED", {
      due: true,
      pipeline_run_id: published.run_id,
      opportunity_id: published.opportunity_id,
      program_id: published.program_id,
      drafts_generated: 1,
      validation_passed: true,
      publish_attempted: true,
      publish_succeeded: true,
      guide_id: published.guide.id,
      published_at: publishedAt,
      error_code: null,
      error_message: null,
    });
  } catch (error) {
    const code: AutomationErrorCode =
      error instanceof AutomationError ? error.code : "generation_failed";
    return finish("ERROR", {
      error_code: code,
      error_message: error instanceof Error ? error.message : "Content automation failed.",
      publish_attempted: execution.publish_attempted,
      publish_succeeded: execution.publish_succeeded,
      guide_id: execution.guide_id,
      published_at: execution.published_at,
    });
  } finally {
    await lease.stop();
    await input.store.releaseLock(AUTOMATION_LOCK_KEY, ownerId);
  }
}
