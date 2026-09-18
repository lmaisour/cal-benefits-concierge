import type { GuideRow } from "@/types/database";
import type {
  ContentOpportunityRecord,
  ContentPipelineRunRecord,
} from "@/lib/content-pipeline/types";

export type PublishedGuideRecord = Pick<
  GuideRow,
  | "id"
  | "title"
  | "slug"
  | "seo_title"
  | "meta_description"
  | "excerpt"
  | "body"
  | "published"
  | "published_at"
  | "created_at"
  | "updated_at"
>;

export type GuideWriteRow = Pick<
  GuideRow,
  "id" | "title" | "slug" | "seo_title" | "meta_description" | "excerpt" | "body" | "published"
> & {
  published_at: string;
};

export class PublishConflictError extends Error {
  readonly code: "guide_slug_conflict" | "guide_id_conflict";

  constructor(code: "guide_slug_conflict" | "guide_id_conflict", message: string) {
    super(message);
    this.name = "PublishConflictError";
    this.code = code;
  }
}

export interface GuidePublishStore {
  getRun(id: string): Promise<ContentPipelineRunRecord | null>;
  getOpportunity(id: string): Promise<ContentOpportunityRecord | null>;
  programExists(programId: string): Promise<boolean>;
  getGuide(id: string): Promise<PublishedGuideRecord | null>;
  insertGuide(row: GuideWriteRow): Promise<PublishedGuideRecord>;
  updateGuide(
    id: string,
    patch: Omit<GuideWriteRow, "id" | "published_at"> & { published_at?: string },
  ): Promise<PublishedGuideRecord>;
  replaceGuidePrograms(guideId: string, programIds: string[]): Promise<void>;
  attachOpportunityGuide(
    opportunityId: string,
    guideId: string,
  ): Promise<ContentOpportunityRecord>;
}
