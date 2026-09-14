import type { Json } from "@/types/database";
import type {
  ContentOpportunityRow,
  ContentPipelineRunRow,
} from "@/types/database";
import { CONTENT_PIPELINE_OPPORTUNITY_TYPE } from "@/lib/content-pipeline/types";
import type {
  ContentOpportunityRecord,
  ContentPipelineRunRecord,
  ContentDraft,
  EvidencePackage,
  ProviderMetadata,
  ScoreBreakdown,
  ValidationResult,
} from "@/lib/content-pipeline/types";
import type {
  ContentPipelineStore,
  CreateRunInput,
  UpdateRunInput,
  UpsertOpportunityInput,
} from "@/lib/content-pipeline/store";

type QueryError = { message: string; code?: string } | null;

export type PipelineStoreClient = {
  // Real PostgREST builders and test doubles only share a `from()` surface.
  from: (table: string) => {
    select: (columns?: string) => unknown;
    insert: (row: Record<string, unknown>) => unknown;
    update: (row: Record<string, unknown>) => unknown;
  };
};

type StoreQuery = {
  select: (columns?: string) => StoreQuery;
  eq: (column: string, value: unknown) => StoreQuery;
  maybeSingle: () => Promise<{
    data: ContentOpportunityRow | ContentPipelineRunRow | null;
    error: QueryError;
  }>;
  single: () => Promise<{
    data: ContentOpportunityRow | ContentPipelineRunRow | null;
    error: QueryError;
  }>;
};

function asJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function mapOpportunity(row: ContentOpportunityRow): ContentOpportunityRecord {
  return {
    id: row.id,
    opportunity_type: CONTENT_PIPELINE_OPPORTUNITY_TYPE,
    program_id: row.program_id ?? "",
    guide_id: row.guide_id,
    proposed_slug: row.proposed_slug ?? "",
    proposed_title: row.proposed_title ?? "",
    primary_keyword: row.primary_keyword ?? "",
    secondary_keywords: row.secondary_keywords,
    score: Number(row.score),
    score_breakdown: row.score_breakdown as ScoreBreakdown,
    discovery_reason: row.discovery_reason ?? "",
    status: row.status,
    next_eligible_at: row.next_eligible_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapRun(row: ContentPipelineRunRow): ContentPipelineRunRecord {
  return {
    id: row.id,
    opportunity_id: row.opportunity_id,
    mode: row.mode,
    status: row.status,
    started_at: row.started_at,
    completed_at: row.completed_at,
    selected_reason: row.selected_reason,
    evidence_snapshot: row.evidence_snapshot as EvidencePackage | null,
    draft_snapshot: row.draft_snapshot as ContentDraft | null,
    validation_snapshot: row.validation_snapshot as ValidationResult | null,
    error_message: row.error_message,
    provider_metadata: row.provider_metadata as ProviderMetadata | null,
    created_at: row.created_at,
  };
}

export class SupabaseContentPipelineStore implements ContentPipelineStore {
  constructor(private readonly client: PipelineStoreClient) {}

  async createRun(input: CreateRunInput): Promise<ContentPipelineRunRecord> {
    const { data, error } = await (
      this.client.from("content_pipeline_runs").insert({
        id: input.id,
        mode: "DRY_RUN",
        status: "STARTED",
        started_at: input.started_at,
      }) as StoreQuery
    )
      .select("*")
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create content pipeline run.");
    }
    return mapRun(data as ContentPipelineRunRow);
  }

  async updateRun(id: string, patch: UpdateRunInput): Promise<ContentPipelineRunRecord> {
    const payload: Record<string, unknown> = {};
    if (patch.opportunity_id !== undefined) payload.opportunity_id = patch.opportunity_id;
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.completed_at !== undefined) payload.completed_at = patch.completed_at;
    if (patch.selected_reason !== undefined) payload.selected_reason = patch.selected_reason;
    if (patch.evidence_snapshot !== undefined) {
      payload.evidence_snapshot = patch.evidence_snapshot
        ? asJson(patch.evidence_snapshot)
        : null;
    }
    if (patch.draft_snapshot !== undefined) {
      payload.draft_snapshot = patch.draft_snapshot ? asJson(patch.draft_snapshot) : null;
    }
    if (patch.validation_snapshot !== undefined) {
      payload.validation_snapshot = patch.validation_snapshot
        ? asJson(patch.validation_snapshot)
        : null;
    }
    if (patch.error_message !== undefined) payload.error_message = patch.error_message;
    if (patch.provider_metadata !== undefined) {
      payload.provider_metadata = patch.provider_metadata
        ? asJson(patch.provider_metadata)
        : null;
    }

    const { data, error } = await (
      this.client.from("content_pipeline_runs").update(payload) as StoreQuery
    )
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? `Failed to update content pipeline run ${id}.`);
    }
    return mapRun(data as ContentPipelineRunRow);
  }

  async getOpportunityByProgram(
    opportunityType: string,
    programId: string,
  ): Promise<ContentOpportunityRecord | null> {
    const { data, error } = await (
      this.client.from("content_opportunities").select("*") as StoreQuery
    )
      .eq("opportunity_type", opportunityType)
      .eq("program_id", programId)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return data ? mapOpportunity(data as ContentOpportunityRow) : null;
  }

  async upsertOpportunity(input: UpsertOpportunityInput): Promise<ContentOpportunityRecord> {
    const existing = await this.getOpportunityByProgram(
      input.opportunity_type,
      input.program_id,
    );
    const payload = {
      opportunity_type: input.opportunity_type,
      program_id: input.program_id,
      guide_id: input.guide_id,
      proposed_slug: input.proposed_slug,
      proposed_title: input.proposed_title,
      primary_keyword: input.primary_keyword,
      secondary_keywords: input.secondary_keywords,
      score: input.score,
      score_breakdown: asJson(input.score_breakdown),
      discovery_reason: input.discovery_reason,
      status: input.status,
      next_eligible_at: input.next_eligible_at,
    };

    if (existing) {
      const { data, error } = await (
        this.client.from("content_opportunities").update(payload) as StoreQuery
      )
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error || !data) {
        throw new Error(error?.message ?? "Failed to update content opportunity.");
      }
      return mapOpportunity(data as ContentOpportunityRow);
    }

    const { data, error } = await (
      this.client.from("content_opportunities").insert({
        id: input.id,
        ...payload,
      }) as StoreQuery
    )
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") {
        const raced = await this.getOpportunityByProgram(
          input.opportunity_type,
          input.program_id,
        );
        if (raced) {
          const { data: updated, error: updateError } = await (
            this.client.from("content_opportunities").update(payload) as StoreQuery
          )
            .eq("id", raced.id)
            .select("*")
            .single();
          if (updateError || !updated) {
            throw new Error(updateError?.message ?? "Failed to upsert content opportunity.");
          }
          return mapOpportunity(updated as ContentOpportunityRow);
        }
      }
      throw new Error(error.message);
    }
    if (!data) {
      throw new Error("Failed to insert content opportunity.");
    }
    return mapOpportunity(data as ContentOpportunityRow);
  }

  async updateOpportunity(
    id: string,
    patch: Partial<
      Pick<ContentOpportunityRecord, "status" | "score" | "score_breakdown" | "next_eligible_at">
    >,
  ): Promise<ContentOpportunityRecord> {
    const payload: Record<string, unknown> = {};
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.score !== undefined) payload.score = patch.score;
    if (patch.score_breakdown !== undefined) {
      payload.score_breakdown = asJson(patch.score_breakdown);
    }
    if (patch.next_eligible_at !== undefined) {
      payload.next_eligible_at = patch.next_eligible_at;
    }
    const { data, error } = await (
      this.client.from("content_opportunities").update(payload) as StoreQuery
    )
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? `Failed to update content opportunity ${id}.`);
    }
    return mapOpportunity(data as ContentOpportunityRow);
  }
}
