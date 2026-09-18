import type { GuideRow } from "@/types/database";
import type { PipelineStoreClient } from "@/lib/content-pipeline/supabase-store";
import { SupabaseContentPipelineStore } from "@/lib/content-pipeline/supabase-store";
import type {
  GuidePublishStore,
  GuideWriteRow,
  PublishedGuideRecord,
} from "@/lib/content-pipeline/publish-store";
import { PublishConflictError } from "@/lib/content-pipeline/publish-store";

type QueryError = { message: string; code?: string } | null;

type GuideQuery = {
  select: (columns?: string) => GuideQuery;
  insert: (row: Record<string, unknown> | Record<string, unknown>[]) => GuideQuery;
  update: (row: Record<string, unknown>) => GuideQuery;
  delete: () => GuideQuery;
  eq: (column: string, value: unknown) => GuideQuery;
  maybeSingle: () => Promise<{ data: GuideRow | { id: string } | null; error: QueryError }>;
  single: () => Promise<{ data: GuideRow | null; error: QueryError }>;
  then: (
    resolve: (value: { data: unknown; error: QueryError }) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise<unknown>;
};

function isUniqueViolation(error: QueryError): boolean {
  return error?.code === "23505";
}

function mapGuide(row: GuideRow): PublishedGuideRecord {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    seo_title: row.seo_title,
    meta_description: row.meta_description,
    excerpt: row.excerpt,
    body: row.body,
    published: row.published,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class SupabaseGuidePublishStore implements GuidePublishStore {
  private readonly pipeline: SupabaseContentPipelineStore;

  constructor(private readonly client: PipelineStoreClient) {
    this.pipeline = new SupabaseContentPipelineStore(client);
  }

  getRun(id: string) {
    return this.pipeline.getRun(id);
  }

  getOpportunity(id: string) {
    return this.pipeline.getOpportunity(id);
  }

  async programExists(programId: string): Promise<boolean> {
    const { data, error } = await (
      this.client.from("programs").select("id") as GuideQuery
    )
      .eq("id", programId)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return Boolean(data);
  }

  async getGuide(id: string): Promise<PublishedGuideRecord | null> {
    const { data, error } = await (
      this.client.from("guides").select("*") as GuideQuery
    )
      .eq("id", id)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return data ? mapGuide(data) : null;
  }

  async insertGuide(row: GuideWriteRow): Promise<PublishedGuideRecord> {
    const { data, error } = await (
      this.client.from("guides").insert(row) as GuideQuery
    )
      .select("*")
      .single();
    if (error || !data) {
      if (isUniqueViolation(error)) {
        const existing = await this.getGuide(row.id);
        throw new PublishConflictError(
          existing ? "guide_id_conflict" : "guide_slug_conflict",
          error?.message ?? "Guide conflict",
        );
      }
      throw new Error(error?.message ?? "Failed to insert guide.");
    }
    return mapGuide(data);
  }

  async updateGuide(
    id: string,
    patch: Omit<GuideWriteRow, "id" | "published_at"> & { published_at?: string },
  ): Promise<PublishedGuideRecord> {
    const { data, error } = await (
      this.client.from("guides").update(patch) as GuideQuery
    )
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) {
      if (isUniqueViolation(error)) {
        throw new PublishConflictError("guide_slug_conflict", error?.message ?? "Guide conflict");
      }
      throw new Error(error?.message ?? `Failed to update guide ${id}.`);
    }
    return mapGuide(data);
  }

  async replaceGuidePrograms(guideId: string, programIds: string[]): Promise<void> {
    const { error: deleteError } = await (
      this.client.from("guide_programs").delete() as GuideQuery
    ).eq("guide_id", guideId);
    if (deleteError) {
      throw new Error(deleteError.message);
    }
    if (programIds.length === 0) {
      return;
    }
    const inserted = (await this.client.from("guide_programs").insert(
      programIds.map((program_id) => ({ guide_id: guideId, program_id })),
    )) as { data?: unknown; error?: QueryError };
    if (inserted.error) {
      throw new Error(inserted.error.message);
    }
  }

  async attachOpportunityGuide(opportunityId: string, guideId: string) {
    return this.pipeline.updateOpportunity(opportunityId, { guide_id: guideId });
  }
}
