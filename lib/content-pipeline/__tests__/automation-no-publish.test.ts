import { describe, expect, it } from "vitest";
import { CONTENT_PIPELINE_OPPORTUNITY_TYPE } from "@/lib/content-pipeline/types";
import { runContentAutomation } from "@/lib/content-pipeline/run-automation";
import { isAutoPublishEnabled } from "@/lib/content-pipeline/config";
import { MemoryGuidePublishStore } from "@/lib/content-pipeline/memory-publish-store";
import {
  AUTOMATION_NOW,
  BAR_GUIDE_ID,
  BAR_PROGRAM_ID,
  automationStore,
  barRecord,
  catalogContext,
  countingProvider,
  memoryPublishStore,
  otherRecord,
  seedPublishedBar,
} from "./automation-helpers";

describe("automation never publishes unless every switch is on", () => {
  it("keeps autonomous publication disabled by default", () => {
    expect(isAutoPublishEnabled()).toBe(false);
  });

  it("cannot change guides, guide_programs, or opportunity.guide_id when publish is disabled", async () => {
    const store = automationStore();
    const publishStore = memoryPublishStore(store, [BAR_PROGRAM_ID]);
    await seedPublishedBar(store, publishStore);
    const beforeGuideIds = [...store.pipeline.opportunities.values()].map(
      (opportunity) => opportunity.guide_id,
    );
    const result = await runContentAutomation({
      store,
      publishStore,
      loadContext: async () => catalogContext([barRecord(), otherRecord()]),
      provider: countingProvider().provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(result.publish_attempted).toBe(false);
    expect(result.publish_succeeded).toBe(false);
    expect(result.execution.publish_attempted).toBe(false);
    expect(result.execution.publish_succeeded).toBe(false);
    expect(result.execution.guide_id).toBeNull();
    expect(result.execution.status).toBe("COMPLETED_DRY_RUN");
    expect(publishStore.guides.size).toBe(1);
    expect(publishStore.guides.get(BAR_GUIDE_ID)?.slug).toBe("bar-vehicle-retirement");
    expect([...store.pipeline.opportunities.values()].map((opportunity) => opportunity.guide_id)).toEqual(
      expect.arrayContaining(beforeGuideIds),
    );
    const bar = await store.pipeline.getOpportunityByProgram(
      CONTENT_PIPELINE_OPPORTUNITY_TYPE,
      BAR_PROGRAM_ID,
    );
    expect(bar?.guide_id).toBe(BAR_GUIDE_ID);
    const generated = [...store.pipeline.opportunities.values()].filter(
      (opportunity) => opportunity.program_id !== BAR_PROGRAM_ID,
    );
    expect(generated.every((opportunity) => opportunity.guide_id === null)).toBe(true);
  });

  it("does not call the publication store when autonomous publish is off", async () => {
    const store = automationStore();
    const persist = new MemoryGuidePublishStore(store.pipeline, new Set());
    persist.persistPublishedGuide = async () => {
      throw new Error("publication store must not be used while autonomous publish is disabled");
    };
    const result = await runContentAutomation({
      store,
      publishStore: persist,
      loadContext: async () => catalogContext(),
      provider: countingProvider().provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(result.execution.status).toBe("COMPLETED_DRY_RUN");
    expect(result.publish_attempted).toBe(false);
    expect(result.publish_succeeded).toBe(false);
  });
});
