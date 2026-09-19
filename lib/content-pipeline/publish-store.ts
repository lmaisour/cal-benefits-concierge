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

export type PublishGuideWrite = Pick<
  GuideRow,
  "id" | "title" | "slug" | "seo_title" | "meta_description" | "excerpt" | "body"
> & {
  opportunity_id: string;
  program_id: string;
  published_at: string;
};

export type PublishGuideWriteResult = {
  guide: PublishedGuideRecord;
  created: boolean;
};

export type PublishFailAt =
  | "guide_programs"
  | "guide_programs_insert"
  | "opportunity_attach";

export class PublishConflictError extends Error {
  readonly code: "guide_slug_conflict" | "guide_id_conflict" | "guide_missing";

  constructor(
    code: "guide_slug_conflict" | "guide_id_conflict" | "guide_missing",
    message: string,
  ) {
    super(message);
    this.name = "PublishConflictError";
    this.code = code;
  }
}

export interface GuidePublishStore {
  getRun(id: string): Promise<ContentPipelineRunRecord | null>;
  getOpportunity(id: string): Promise<ContentOpportunityRecord | null>;
  getGuide(id: string): Promise<PublishedGuideRecord | null>;
  programExists(programId: string): Promise<boolean>;
  persistPublishedGuide(write: PublishGuideWrite): Promise<PublishGuideWriteResult>;
}
