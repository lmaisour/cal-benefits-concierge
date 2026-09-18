import type { PipelineStoreClient } from "@/lib/content-pipeline/supabase-store";
import { SupabaseContentPipelineStore } from "@/lib/content-pipeline/supabase-store";
import type {
  GuidePublishStore,
  PublishGuideWrite,
  PublishGuideWriteResult,
  PublishedGuideRecord,
} from "@/lib/content-pipeline/publish-store";
import { PublishConflictError } from "@/lib/content-pipeline/publish-store";

type QueryError = { message: string; code?: string } | null;

export type PublishContentGuideArgs = {
  p_guide_id: string;
  p_opportunity_id: string;
  p_program_id: string;
  p_title: string;
  p_slug: string;
  p_seo_title: string | null;
  p_meta_description: string | null;
  p_excerpt: string | null;
  p_body: string;
  p_published_at: string;
  p_fail_at?: string | null;
};

export type PublishStoreClient = PipelineStoreClient & {
  rpc(
    fn: "publish_content_guide",
    args: PublishContentGuideArgs,
  ): PromiseLike<{ data: unknown; error: QueryError }>;
};

type ProgramQuery = {
  select: (columns?: string) => ProgramQuery;
  eq: (column: string, value: unknown) => ProgramQuery;
  maybeSingle: () => Promise<{ data: { id: string } | null; error: QueryError }>;
};

function isIso(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return asObject(parsed);
    } catch {
      return null;
    }
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function mapRpcGuide(row: Record<string, unknown>): PublishedGuideRecord {
  return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    seo_title: row.seo_title == null ? null : String(row.seo_title),
    meta_description: row.meta_description == null ? null : String(row.meta_description),
    excerpt: row.excerpt == null ? null : String(row.excerpt),
    body: String(row.body ?? ""),
    published: Boolean(row.published),
    published_at: isIso(row.published_at),
    created_at: isIso(row.created_at) ?? "",
    updated_at: isIso(row.updated_at) ?? "",
  };
}

function parsePublishResult(data: unknown): PublishGuideWriteResult {
  const payload = asObject(data);
  const guidePayload = asObject(payload?.guide);
  if (!payload || !guidePayload?.id) {
    throw new Error("Publish RPC returned no data.");
  }
  return {
    created: Boolean(payload.created),
    guide: mapRpcGuide(guidePayload),
  };
}

function throwRpcError(error: QueryError): never {
  const message = error?.message ?? "Failed to persist published guide.";
  if (
    message.includes("guide_slug_conflict") ||
    message.includes("guides_slug_key")
  ) {
    throw new PublishConflictError(
      "guide_slug_conflict",
      "A different guide already uses this slug.",
    );
  }
  if (message.includes("guide_missing")) {
    throw new PublishConflictError(
      "guide_missing",
      "Opportunity points at a guide that no longer exists.",
    );
  }
  throw new Error(message);
}

export class SupabaseGuidePublishStore implements GuidePublishStore {
  private readonly pipeline: SupabaseContentPipelineStore;

  constructor(private readonly client: PublishStoreClient) {
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
      this.client.from("programs").select("id") as ProgramQuery
    )
      .eq("id", programId)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return Boolean(data);
  }

  async persistPublishedGuide(write: PublishGuideWrite): Promise<PublishGuideWriteResult> {
    const { data, error } = await this.client.rpc("publish_content_guide", {
      p_guide_id: write.id,
      p_opportunity_id: write.opportunity_id,
      p_program_id: write.program_id,
      p_title: write.title,
      p_slug: write.slug,
      p_seo_title: write.seo_title,
      p_meta_description: write.meta_description,
      p_excerpt: write.excerpt,
      p_body: write.body,
      p_published_at: write.published_at,
    });
    if (error) {
      throwRpcError(error);
    }
    return parsePublishResult(data);
  }
}
