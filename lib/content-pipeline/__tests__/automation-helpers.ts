import { FakeContentDraftProvider } from "@/lib/content-pipeline/generate-draft";
import { MemoryContentPipelineStore } from "@/lib/content-pipeline/store";
import { MemoryContentAutomationStore } from "@/lib/content-pipeline/automation-store";
import { MemoryGuidePublishStore } from "@/lib/content-pipeline/memory-publish-store";
import { CONTENT_PIPELINE_OPPORTUNITY_TYPE } from "@/lib/content-pipeline/types";
import type { ContentDraftProvider, PipelineCatalogContext } from "@/lib/content-pipeline/types";
import { makeRecord, NOW } from "./fixtures";

export const BAR_PROGRAM_ID = "ff7a190d-c5a9-494b-9182-6048b91104dd";
export const BAR_GUIDE_ID = "426de613-e070-4a05-8eb5-b274f76d350e";
export const BAR_OPPORTUNITY_ID = "8203c4ad-1fdc-4950-87d6-4608b8b81910";
export const OTHER_PROGRAM_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

export const AUTOMATION_NOW = new Date("2026-09-19T00:00:00.000Z");
export const BAR_PUBLISHED_AT = "2026-09-19T04:43:52.120Z";

export function barRecord() {
  return makeRecord({
    program_id: BAR_PROGRAM_ID,
    program: {
      name: "BAR Consumer Assistance Program Vehicle Retirement",
      slug: "bar-vehicle-retirement",
      external_id: "CA-VEH-BAR-RETIRE",
      featured: true,
    },
  });
}

export function otherRecord() {
  return makeRecord({
    program_id: OTHER_PROGRAM_ID,
    program: {
      name: "Other Home Rebate",
      slug: "other-home-rebate",
      external_id: "TEST-OTHER-1",
    },
  });
}

export function catalogContext(
  records = [makeRecord()],
): PipelineCatalogContext {
  return {
    records,
    known_routes: [
      "/",
      "/check",
      "/results",
      "/programs",
      "/guides",
      ...records.map((record) => `/programs/${record.program.slug}`),
    ],
    duplicates: {
      slugs: records.map((record) => record.program.slug),
      titles: records.map((record) => record.program.name),
    },
  };
}

export function countingProvider(): {
  provider: ContentDraftProvider;
  calls: () => number;
} {
  const inner = new FakeContentDraftProvider();
  let calls = 0;
  return {
    provider: {
      id: inner.id,
      generateDraft: async (input) => {
        calls += 1;
        return inner.generateDraft(input);
      },
    },
    calls: () => calls,
  };
}

export function openaiCountingProvider(): {
  provider: ContentDraftProvider;
  calls: () => number;
} {
  const counted = countingProvider();
  return {
    provider: {
      id: "openai",
      generateDraft: counted.provider.generateDraft,
    },
    calls: counted.calls,
  };
}

export function automationStore(now: Date = AUTOMATION_NOW) {
  return new MemoryContentAutomationStore(new MemoryContentPipelineStore(), now);
}

export function memoryPublishStore(
  store: MemoryContentAutomationStore,
  programIds: string[],
) {
  return new MemoryGuidePublishStore(store.pipeline, new Set(programIds));
}

export async function seedPublishedBar(
  store: MemoryContentAutomationStore,
  publishStore?: MemoryGuidePublishStore,
) {
  store.publishedProgramIds.add(BAR_PROGRAM_ID);
  await store.pipeline.upsertOpportunity({
    id: BAR_OPPORTUNITY_ID,
    opportunity_type: CONTENT_PIPELINE_OPPORTUNITY_TYPE,
    program_id: BAR_PROGRAM_ID,
    guide_id: BAR_GUIDE_ID,
    proposed_slug: "bar-vehicle-retirement",
    proposed_title: "BAR Consumer Assistance Program Vehicle Retirement",
    primary_keyword: "BAR vehicle retirement",
    secondary_keywords: [],
    score: 99,
    score_breakdown: { version: 1, total: 99, components: [], notes: [] },
    discovery_reason: "already published",
    status: "READY_FOR_REVIEW",
    next_eligible_at: null,
  });
  if (publishStore) {
    publishStore.guides.set(BAR_GUIDE_ID, {
      id: BAR_GUIDE_ID,
      title: "BAR Consumer Assistance Program Vehicle Retirement",
      slug: "bar-vehicle-retirement",
      seo_title: "BAR Consumer Assistance Program Vehicle Retirement",
      meta_description: "Official BAR vehicle retirement award amounts.",
      excerpt: "Cash to retire an eligible vehicle.",
      body: "Overview\n\nExisting BAR guide.",
      published: true,
      published_at: BAR_PUBLISHED_AT,
      created_at: BAR_PUBLISHED_AT,
      updated_at: BAR_PUBLISHED_AT,
    });
    publishStore.guidePrograms.set(BAR_GUIDE_ID, [BAR_PROGRAM_ID]);
  }
}

export { NOW };
