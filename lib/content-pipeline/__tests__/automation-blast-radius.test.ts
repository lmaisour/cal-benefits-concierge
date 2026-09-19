import { describe, expect, it } from "vitest";
import { FakeContentDraftProvider } from "@/lib/content-pipeline/generate-draft";
import { runContentAutomation } from "@/lib/content-pipeline/run-automation";
import { CONTENT_PIPELINE_OPPORTUNITY_TYPE } from "@/lib/content-pipeline/types";
import {
  AUTOMATION_NOW,
  BAR_PROGRAM_ID,
  OTHER_PROGRAM_ID,
  automationStore,
  barRecord,
  catalogContext,
  countingProvider,
  otherRecord,
} from "./automation-helpers";
import { makeRecord } from "./fixtures";

function pgrst303() {
  const error = new Error("JWT issued at future") as Error & { code: string };
  error.code = "PGRST303";
  return error;
}

describe("automation blast radius", () => {
  it("generates at most one draft per execution", async () => {
    const store = automationStore();
    const counted = countingProvider();
    const first = makeRecord();
    const second = otherRecord();
    const result = await runContentAutomation({
      store,
      loadContext: async () => catalogContext([first, second]),
      provider: counted.provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(result.execution.status).toBe("COMPLETED_DRY_RUN");
    expect(counted.calls()).toBe(1);
    expect(result.execution.drafts_generated).toBe(1);
    expect(store.pipeline.runs.size).toBe(1);
    const drafted = [...store.pipeline.opportunities.values()].filter(
      (opportunity) => opportunity.status === "READY_FOR_REVIEW",
    );
    expect(drafted).toHaveLength(1);
  });

  it("excludes BAR and other published PROGRAM_GUIDE programs from selection", async () => {
    const store = automationStore();
    store.publishedProgramIds.add(BAR_PROGRAM_ID);
    await store.pipeline.upsertOpportunity({
      id: "8203c4ad-1fdc-4950-87d6-4608b8b81910",
      opportunity_type: CONTENT_PIPELINE_OPPORTUNITY_TYPE,
      program_id: BAR_PROGRAM_ID,
      guide_id: "426de613-e070-4a05-8eb5-b274f76d350e",
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
    const counted = countingProvider();
    const result = await runContentAutomation({
      store,
      loadContext: async () => catalogContext([barRecord(), otherRecord()]),
      provider: counted.provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(result.execution.status).toBe("COMPLETED_DRY_RUN");
    expect(result.execution.program_id).toBe(OTHER_PROGRAM_ID);
    expect(counted.calls()).toBe(1);
    const barOpportunity = await store.pipeline.getOpportunityByProgram(
      CONTENT_PIPELINE_OPPORTUNITY_TYPE,
      BAR_PROGRAM_ID,
    );
    expect(barOpportunity?.guide_id).toBe("426de613-e070-4a05-8eb5-b274f76d350e");
  });

  it("does not generate multiple drafts when a database read is retried", async () => {
    const store = automationStore();
    const counted = countingProvider();
    let loads = 0;
    const result = await runContentAutomation({
      store,
      loadContext: async () => {
        loads += 1;
        if (loads < 3) {
          throw pgrst303();
        }
        return catalogContext();
      },
      provider: counted.provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
      sleep: async () => undefined,
      random: () => 0,
    });
    expect(result.execution.status).toBe("COMPLETED_DRY_RUN");
    expect(loads).toBeGreaterThan(1);
    expect(counted.calls()).toBe(1);
    expect(store.pipeline.runs.size).toBe(1);
    expect(result.execution.drafts_generated).toBe(1);
  });

  it("fails closed on an invalid provider without generating a draft", async () => {
    const store = automationStore();
    const previous = process.env.CONTENT_PIPELINE_DRAFT_PROVIDER;
    process.env.CONTENT_PIPELINE_DRAFT_PROVIDER = "not-a-provider";
    try {
      await expect(
        runContentAutomation({
          store,
          loadContext: async () => catalogContext(),
          now: AUTOMATION_NOW,
          leaseSeconds: 180,
        }),
      ).rejects.toMatchObject({ code: "invalid_provider" });
      expect(store.pipeline.runs.size).toBe(0);
      expect(store.executions.size).toBe(0);
    } finally {
      if (previous === undefined) {
        delete process.env.CONTENT_PIPELINE_DRAFT_PROVIDER;
      } else {
        process.env.CONTENT_PIPELINE_DRAFT_PROVIDER = previous;
      }
    }
  });

  it("does not retry a validation failure or generate a second draft", async () => {
    const store = automationStore();
    const inner = new FakeContentDraftProvider();
    let calls = 0;
    const result = await runContentAutomation({
      store,
      loadContext: async () => catalogContext(),
      provider: {
        id: "fake",
        generateDraft: async (input) => {
          calls += 1;
          const draft = await inner.generateDraft(input);
          return {
            ...draft,
            seo_title: "You qualify and will receive $999999 guaranteed today",
            h1: "You qualify and will receive $999999 guaranteed today",
            source_claims: [],
          };
        },
      },
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(calls).toBe(1);
    expect(result.execution.status).toBe("BLOCKED");
    expect(result.execution.error_code).toBe("validation_failed");
    expect(result.execution.drafts_generated).toBe(1);
    expect(store.pipeline.runs.size).toBe(1);
    expect(store.schedule.last_successful_publish_at).toBeNull();
  });

  it("does not fall back from fake to OpenAI", async () => {
    const store = automationStore();
    const result = await runContentAutomation({
      store,
      loadContext: async () => catalogContext(),
      provider: new FakeContentDraftProvider(),
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(result.execution.provider).toBe("fake");
    expect(result.execution.status).toBe("COMPLETED_DRY_RUN");
  });
});
