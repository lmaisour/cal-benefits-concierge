import type { GuideRow } from "@/types/database";
import type { MemoryContentPipelineStore } from "@/lib/content-pipeline/store";
import type {
  GuidePublishStore,
  GuideWriteRow,
  PublishedGuideRecord,
} from "@/lib/content-pipeline/publish-store";
import { PublishConflictError } from "@/lib/content-pipeline/publish-store";

function toRecord(row: GuideRow): PublishedGuideRecord {
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

export class MemoryGuidePublishStore implements GuidePublishStore {
  readonly guides = new Map<string, GuideRow>();
  readonly guidePrograms = new Map<string, string[]>();

  constructor(
    private readonly pipeline: MemoryContentPipelineStore,
    private readonly programs: Set<string>,
  ) {}

  async getRun(id: string) {
    return this.pipeline.getRun(id);
  }

  async getOpportunity(id: string) {
    return this.pipeline.getOpportunity(id);
  }

  async programExists(programId: string): Promise<boolean> {
    return this.programs.has(programId);
  }

  async getGuide(id: string): Promise<PublishedGuideRecord | null> {
    const row = this.guides.get(id);
    return row ? toRecord(row) : null;
  }

  async insertGuide(row: GuideWriteRow): Promise<PublishedGuideRecord> {
    if (this.guides.has(row.id)) {
      throw new PublishConflictError("guide_id_conflict", "Guide id already exists.");
    }
    for (const existing of this.guides.values()) {
      if (existing.slug === row.slug) {
        throw new PublishConflictError("guide_slug_conflict", "Guide slug already exists.");
      }
    }
    const now = row.published_at;
    const stored: GuideRow = {
      ...row,
      created_at: now,
      updated_at: now,
    };
    this.guides.set(stored.id, stored);
    return toRecord(stored);
  }

  async updateGuide(
    id: string,
    patch: Omit<GuideWriteRow, "id" | "published_at"> & { published_at?: string },
  ): Promise<PublishedGuideRecord> {
    const existing = this.guides.get(id);
    if (!existing) {
      throw new Error(`Unknown guide ${id}`);
    }
    for (const other of this.guides.values()) {
      if (other.id !== id && other.slug === patch.slug) {
        throw new PublishConflictError("guide_slug_conflict", "Guide slug already exists.");
      }
    }
    const next: GuideRow = {
      ...existing,
      ...patch,
      id,
      published_at: patch.published_at ?? existing.published_at,
      updated_at: new Date().toISOString(),
    };
    this.guides.set(id, next);
    return toRecord(next);
  }

  async replaceGuidePrograms(guideId: string, programIds: string[]): Promise<void> {
    this.guidePrograms.set(guideId, [...programIds]);
  }

  async attachOpportunityGuide(opportunityId: string, guideId: string) {
    return this.pipeline.updateOpportunity(opportunityId, { guide_id: guideId });
  }
}
