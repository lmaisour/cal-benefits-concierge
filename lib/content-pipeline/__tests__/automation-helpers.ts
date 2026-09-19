import { FakeContentDraftProvider } from "@/lib/content-pipeline/generate-draft";
import { MemoryContentPipelineStore } from "@/lib/content-pipeline/store";
import { MemoryContentAutomationStore } from "@/lib/content-pipeline/automation-store";
import type { ContentDraftProvider, PipelineCatalogContext } from "@/lib/content-pipeline/types";
import { makeRecord, NOW } from "./fixtures";

export const BAR_PROGRAM_ID = "ff7a190d-c5a9-494b-9182-6048b91104dd";
export const OTHER_PROGRAM_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

export const AUTOMATION_NOW = new Date("2026-09-19T00:00:00.000Z");

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

export function automationStore(now: Date = AUTOMATION_NOW) {
  return new MemoryContentAutomationStore(new MemoryContentPipelineStore(), now);
}

export { NOW };
