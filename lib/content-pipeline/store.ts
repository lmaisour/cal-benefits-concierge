import { opportunityId } from "@/lib/content-pipeline/ids";
import type {
  ContentOpportunityRecord,
  ContentPipelineRunRecord,
  EvidencePackage,
  ContentDraft,
  ProviderMetadata,
  ValidationResult,
} from "@/lib/content-pipeline/types";
import type { ContentOpportunityStatus, ContentPipelineRunStatus } from "@/types/database";

export type CreateRunInput = {
  id: string;
  started_at: string;
};

export type UpdateRunInput = {
  opportunity_id?: string | null;
  status?: ContentPipelineRunStatus;
  completed_at?: string | null;
  selected_reason?: string | null;
  evidence_snapshot?: EvidencePackage | null;
  draft_snapshot?: ContentDraft | null;
  validation_snapshot?: ValidationResult | null;
  error_message?: string | null;
  provider_metadata?: ProviderMetadata | null;
};

export type UpsertOpportunityInput = Omit<
  ContentOpportunityRecord,
  "created_at" | "updated_at"
> & {
  created_at?: string;
  updated_at?: string;
};

export interface ContentPipelineStore {
  createRun(input: CreateRunInput): Promise<ContentPipelineRunRecord>;
  updateRun(id: string, patch: UpdateRunInput): Promise<ContentPipelineRunRecord>;
  upsertOpportunity(input: UpsertOpportunityInput): Promise<ContentOpportunityRecord>;
  updateOpportunity(
    id: string,
    patch: Partial<
      Pick<ContentOpportunityRecord, "status" | "score" | "score_breakdown" | "next_eligible_at">
    >,
  ): Promise<ContentOpportunityRecord>;
  getOpportunityByProgram(
    opportunityType: string,
    programId: string,
  ): Promise<ContentOpportunityRecord | null>;
}

export function memoryOpportunityKey(opportunityType: string, programId: string): string {
  return `${opportunityType}:${programId}`;
}

export class MemoryContentPipelineStore implements ContentPipelineStore {
  readonly opportunities = new Map<string, ContentOpportunityRecord>();
  readonly runs = new Map<string, ContentPipelineRunRecord>();

  async createRun(input: CreateRunInput): Promise<ContentPipelineRunRecord> {
    const run: ContentPipelineRunRecord = {
      id: input.id,
      opportunity_id: null,
      mode: "DRY_RUN",
      status: "STARTED",
      started_at: input.started_at,
      completed_at: null,
      selected_reason: null,
      evidence_snapshot: null,
      draft_snapshot: null,
      validation_snapshot: null,
      error_message: null,
      provider_metadata: null,
      created_at: input.started_at,
    };
    this.runs.set(run.id, run);
    return run;
  }

  async updateRun(id: string, patch: UpdateRunInput): Promise<ContentPipelineRunRecord> {
    const existing = this.runs.get(id);
    if (!existing) {
      throw new Error(`Unknown pipeline run ${id}`);
    }
    const next = { ...existing, ...patch };
    this.runs.set(id, next);
    return next;
  }

  async upsertOpportunity(input: UpsertOpportunityInput): Promise<ContentOpportunityRecord> {
    const key = memoryOpportunityKey(input.opportunity_type, input.program_id);
    const existing = this.opportunities.get(key);
    const now = input.updated_at ?? new Date().toISOString();
    const record: ContentOpportunityRecord = {
      ...input,
      id: existing?.id ?? input.id ?? opportunityId(input.opportunity_type, input.program_id),
      created_at: existing?.created_at ?? input.created_at ?? now,
      updated_at: now,
    };
    this.opportunities.set(key, record);
    return record;
  }

  async updateOpportunity(
    id: string,
    patch: Partial<
      Pick<ContentOpportunityRecord, "status" | "score" | "score_breakdown" | "next_eligible_at">
    >,
  ): Promise<ContentOpportunityRecord> {
    for (const [key, record] of this.opportunities) {
      if (record.id === id) {
        const next = { ...record, ...patch, updated_at: new Date().toISOString() };
        this.opportunities.set(key, next);
        return next;
      }
    }
    throw new Error(`Unknown opportunity ${id}`);
  }

  async getOpportunityByProgram(
    opportunityType: string,
    programId: string,
  ): Promise<ContentOpportunityRecord | null> {
    return this.opportunities.get(memoryOpportunityKey(opportunityType, programId)) ?? null;
  }
}

let singleton: MemoryContentPipelineStore | null = null;

export function getMemoryContentPipelineStore(): MemoryContentPipelineStore {
  if (!singleton) {
    singleton = new MemoryContentPipelineStore();
  }
  return singleton;
}

export function resetMemoryContentPipelineStore(): void {
  singleton = new MemoryContentPipelineStore();
}

export function opportunityStatusAfterValidation(
  passed: boolean,
): ContentOpportunityStatus {
  return passed ? "READY_FOR_REVIEW" : "VALIDATION_FAILED";
}

export function runStatusAfterValidation(
  passed: boolean,
): ContentPipelineRunStatus {
  return passed ? "COMPLETED" : "BLOCKED";
}
