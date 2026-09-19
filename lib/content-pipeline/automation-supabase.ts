import type { Json } from "@/types/database";
import type { PipelineStoreClient } from "@/lib/content-pipeline/supabase-store";
import { SupabaseContentPipelineStore } from "@/lib/content-pipeline/supabase-store";
import type { ContentAutomationStore } from "@/lib/content-pipeline/automation-store";
import { AUTOMATION_SCHEDULE_ID } from "@/lib/content-pipeline/automation-types";
import type {
  AutomationExecutionRecord,
  AutomationLockResult,
  AutomationScheduleState,
  CreateAutomationExecutionInput,
  UpdateAutomationExecutionInput,
} from "@/lib/content-pipeline/automation-types";

type QueryError = { message: string; code?: string } | null;

type TableQuery = {
  select: (columns?: string) => TableQuery;
  insert: (row: Record<string, unknown>) => TableQuery;
  update: (row: Record<string, unknown>) => TableQuery;
  eq: (column: string, value: unknown) => TableQuery;
  not: (column: string, operator: string, value: unknown) => TableQuery;
  single: () => Promise<{ data: Record<string, unknown> | null; error: QueryError }>;
  maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: QueryError }>;
  then: (
    resolve: (value: { data: unknown; error: QueryError }) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise<unknown>;
};

export type AutomationStoreClient = PipelineStoreClient & {
  rpc(
    fn: "acquire_content_automation_lock" | "release_content_automation_lock",
    args: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: QueryError }>;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      return asObject(JSON.parse(value));
    } catch {
      return null;
    }
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function mapSchedule(row: Record<string, unknown>): AutomationScheduleState {
  return {
    id: AUTOMATION_SCHEDULE_ID,
    last_successful_publish_at: (row.last_successful_publish_at as string | null) ?? null,
    next_publish_at: String(row.next_publish_at),
    updated_at: String(row.updated_at),
  };
}

function mapExecution(row: Record<string, unknown>): AutomationExecutionRecord {
  return {
    id: String(row.id),
    started_at: String(row.started_at),
    completed_at: (row.completed_at as string | null) ?? null,
    status: row.status as AutomationExecutionRecord["status"],
    trigger: row.trigger as AutomationExecutionRecord["trigger"],
    due: typeof row.due === "boolean" ? row.due : row.due == null ? null : Boolean(row.due),
    lock_owner: (row.lock_owner as string | null) ?? null,
    pipeline_run_id: (row.pipeline_run_id as string | null) ?? null,
    opportunity_id: (row.opportunity_id as string | null) ?? null,
    program_id: (row.program_id as string | null) ?? null,
    provider: (row.provider as string | null) ?? null,
    attempt_count: Number(row.attempt_count ?? 0),
    drafts_generated: Number(row.drafts_generated ?? 0),
    validation_passed:
      typeof row.validation_passed === "boolean" ? row.validation_passed : null,
    authoritative_state_fingerprint:
      (row.authoritative_state_fingerprint as string | null) ?? null,
    publish_attempted: Boolean(row.publish_attempted),
    publish_succeeded: Boolean(row.publish_succeeded),
    guide_id: (row.guide_id as string | null) ?? null,
    error_code: (row.error_code as string | null) ?? null,
    error_message: (row.error_message as string | null) ?? null,
    provider_usage: (row.provider_usage as Json | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export class SupabaseContentAutomationStore implements ContentAutomationStore {
  readonly pipeline: SupabaseContentPipelineStore;

  constructor(private readonly client: AutomationStoreClient) {
    this.pipeline = new SupabaseContentPipelineStore(client);
  }

  async getSchedule(): Promise<AutomationScheduleState> {
    const { data, error } = await (
      this.client.from("content_automation_schedule").select("*") as TableQuery
    )
      .eq("id", AUTOMATION_SCHEDULE_ID)
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "Failed to load automation schedule.");
    }
    return mapSchedule(data);
  }

  async markSuccessfulPublication(
    publishedAt: string,
    nextPublishAt: string,
  ): Promise<AutomationScheduleState> {
    const { data, error } = await (
      this.client.from("content_automation_schedule").update({
        last_successful_publish_at: publishedAt,
        next_publish_at: nextPublishAt,
        updated_at: publishedAt,
      }) as TableQuery
    )
      .eq("id", AUTOMATION_SCHEDULE_ID)
      .select("*")
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update automation schedule.");
    }
    return mapSchedule(data);
  }

  async acquireLock(input: {
    lockKey: string;
    ownerId: string;
    leaseSeconds: number;
  }): Promise<AutomationLockResult> {
    const { data, error } = await this.client.rpc("acquire_content_automation_lock", {
      p_lock_key: input.lockKey,
      p_owner_id: input.ownerId,
      p_lease_seconds: input.leaseSeconds,
    });
    if (error) {
      throw new Error(error.message);
    }
    const payload = asObject(data);
    return {
      acquired: Boolean(payload?.acquired),
      owner_id: payload?.owner_id ? String(payload.owner_id) : undefined,
      expires_at: payload?.expires_at ? String(payload.expires_at) : undefined,
    };
  }

  async releaseLock(lockKey: string, ownerId: string): Promise<boolean> {
    const { data, error } = await this.client.rpc("release_content_automation_lock", {
      p_lock_key: lockKey,
      p_owner_id: ownerId,
    });
    if (error) {
      throw new Error(error.message);
    }
    return Boolean(data);
  }

  async createExecution(input: CreateAutomationExecutionInput): Promise<AutomationExecutionRecord> {
    const { data, error } = await (
      this.client.from("content_automation_executions").insert({
        id: input.id,
        started_at: input.started_at,
        status: "STARTED",
        trigger: input.trigger,
        lock_owner: input.lock_owner ?? null,
        provider: input.provider ?? null,
        publish_attempted: false,
        publish_succeeded: false,
      }) as TableQuery
    )
      .select("*")
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create automation execution.");
    }
    return mapExecution(data);
  }

  async updateExecution(
    id: string,
    patch: UpdateAutomationExecutionInput,
  ): Promise<AutomationExecutionRecord> {
    const { data, error } = await (
      this.client.from("content_automation_executions").update(patch as Record<string, unknown>) as TableQuery
    )
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? `Failed to update automation execution ${id}.`);
    }
    return mapExecution(data);
  }

  async listPublishedProgramIds(): Promise<string[]> {
    const ids = new Set<string>();
    const opportunities = (await Promise.resolve(
      this.client.from("content_opportunities").select("program_id,guide_id"),
    )) as { data: Array<{ program_id: string | null; guide_id: string | null }> | null; error: QueryError };
    if (opportunities.error) {
      throw new Error(opportunities.error.message);
    }
    for (const row of opportunities.data ?? []) {
      if (row.guide_id && row.program_id) {
        ids.add(row.program_id);
      }
    }
    const publishedGuides = (await Promise.resolve(
      this.client.from("guides").select("id,published"),
    )) as { data: Array<{ id: string; published: boolean }> | null; error: QueryError };
    if (publishedGuides.error) {
      throw new Error(publishedGuides.error.message);
    }
    const publishedIds = new Set(
      (publishedGuides.data ?? []).filter((row) => row.published).map((row) => row.id),
    );
    const relations = (await Promise.resolve(
      this.client.from("guide_programs").select("guide_id,program_id"),
    )) as { data: Array<{ guide_id: string; program_id: string }> | null; error: QueryError };
    if (relations.error) {
      throw new Error(relations.error.message);
    }
    for (const row of relations.data ?? []) {
      if (publishedIds.has(row.guide_id)) {
        ids.add(row.program_id);
      }
    }
    return [...ids];
  }
}
