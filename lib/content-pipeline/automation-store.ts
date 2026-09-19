import { AUTOMATION_SCHEDULE_ID } from "@/lib/content-pipeline/automation-types";
import type {
  AutomationExecutionRecord,
  AutomationLockResult,
  AutomationScheduleState,
  CreateAutomationExecutionInput,
  UpdateAutomationExecutionInput,
} from "@/lib/content-pipeline/automation-types";
import type { ContentPipelineStore } from "@/lib/content-pipeline/store";
import { MemoryContentPipelineStore } from "@/lib/content-pipeline/store";

export interface ContentAutomationStore {
  readonly pipeline: ContentPipelineStore;
  getSchedule(): Promise<AutomationScheduleState>;
  markSuccessfulPublication(publishedAt: string, nextPublishAt: string): Promise<AutomationScheduleState>;
  acquireLock(input: {
    lockKey: string;
    ownerId: string;
    leaseSeconds: number;
    now?: Date;
  }): Promise<AutomationLockResult>;
  releaseLock(lockKey: string, ownerId: string): Promise<boolean>;
  createExecution(input: CreateAutomationExecutionInput): Promise<AutomationExecutionRecord>;
  updateExecution(
    id: string,
    patch: UpdateAutomationExecutionInput,
  ): Promise<AutomationExecutionRecord>;
  listPublishedProgramIds(): Promise<string[]>;
}

type LockRow = {
  owner_id: string;
  acquired_at: string;
  expires_at: string;
};

function iso(date: Date): string {
  return date.toISOString();
}

export class MemoryContentAutomationStore implements ContentAutomationStore {
  readonly pipeline: MemoryContentPipelineStore;
  readonly publishedProgramIds = new Set<string>();
  schedule: AutomationScheduleState;
  readonly executions = new Map<string, AutomationExecutionRecord>();
  readonly locks = new Map<string, LockRow>();

  constructor(
    pipeline: MemoryContentPipelineStore = new MemoryContentPipelineStore(),
    now: Date = new Date(),
  ) {
    this.pipeline = pipeline;
    const started = iso(now);
    this.schedule = {
      id: AUTOMATION_SCHEDULE_ID,
      last_successful_publish_at: null,
      next_publish_at: started,
      updated_at: started,
    };
  }

  async getSchedule(): Promise<AutomationScheduleState> {
    return { ...this.schedule };
  }

  async markSuccessfulPublication(
    publishedAt: string,
    nextPublishAt: string,
  ): Promise<AutomationScheduleState> {
    this.schedule = {
      ...this.schedule,
      last_successful_publish_at: publishedAt,
      next_publish_at: nextPublishAt,
      updated_at: publishedAt,
    };
    return { ...this.schedule };
  }

  async acquireLock(input: {
    lockKey: string;
    ownerId: string;
    leaseSeconds: number;
    now?: Date;
  }): Promise<AutomationLockResult> {
    const now = input.now ?? new Date();
    const expiresAt = new Date(now.getTime() + input.leaseSeconds * 1000).toISOString();
    const existing = this.locks.get(input.lockKey);
    if (
      existing &&
      existing.owner_id !== input.ownerId &&
      new Date(existing.expires_at).getTime() > now.getTime()
    ) {
      return { acquired: false };
    }
    this.locks.set(input.lockKey, {
      owner_id: input.ownerId,
      acquired_at: iso(now),
      expires_at: expiresAt,
    });
    return { acquired: true, owner_id: input.ownerId, expires_at: expiresAt };
  }

  async releaseLock(lockKey: string, ownerId: string): Promise<boolean> {
    const existing = this.locks.get(lockKey);
    if (!existing || existing.owner_id !== ownerId) {
      return false;
    }
    this.locks.delete(lockKey);
    return true;
  }

  async createExecution(input: CreateAutomationExecutionInput): Promise<AutomationExecutionRecord> {
    const record: AutomationExecutionRecord = {
      id: input.id,
      started_at: input.started_at,
      completed_at: null,
      status: "STARTED",
      trigger: input.trigger,
      due: null,
      lock_owner: input.lock_owner ?? null,
      pipeline_run_id: null,
      opportunity_id: null,
      program_id: null,
      provider: input.provider ?? null,
      attempt_count: 0,
      drafts_generated: 0,
      validation_passed: null,
      authoritative_state_fingerprint: null,
      publish_attempted: false,
      publish_succeeded: false,
      guide_id: null,
      error_code: null,
      error_message: null,
      provider_usage: null,
      created_at: input.started_at,
      updated_at: input.started_at,
    };
    this.executions.set(record.id, record);
    return { ...record };
  }

  async updateExecution(
    id: string,
    patch: UpdateAutomationExecutionInput,
  ): Promise<AutomationExecutionRecord> {
    const existing = this.executions.get(id);
    if (!existing) {
      throw new Error(`Unknown automation execution ${id}`);
    }
    const next = { ...existing, ...patch, updated_at: new Date().toISOString() };
    this.executions.set(id, next);
    return { ...next };
  }

  async listPublishedProgramIds(): Promise<string[]> {
    const ids = new Set(this.publishedProgramIds);
    for (const opportunity of this.pipeline.opportunities.values()) {
      if (opportunity.guide_id) {
        ids.add(opportunity.program_id);
      }
    }
    return [...ids];
  }
}
