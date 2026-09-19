import { describe, expect, it } from "vitest";
import {
  isCycleDue,
  nextPublishAfter,
  runContentAutomation,
} from "@/lib/content-pipeline/run-automation";
import { AUTOMATION_CADENCE_MS } from "@/lib/content-pipeline/automation-types";
import {
  AUTOMATION_NOW,
  automationStore,
  catalogContext,
  countingProvider,
} from "./automation-helpers";

describe("publication cadence", () => {
  it("computes the next publish time 48 hours after success", () => {
    const publishedAt = new Date("2026-09-19T04:43:52.000Z");
    expect(nextPublishAfter(publishedAt).toISOString()).toBe("2026-09-21T04:43:52.000Z");
    expect(AUTOMATION_CADENCE_MS).toBe(48 * 60 * 60 * 1000);
  });

  it("does not generate when the cycle is not due", async () => {
    const store = automationStore();
    store.schedule.next_publish_at = new Date(AUTOMATION_NOW.getTime() + AUTOMATION_CADENCE_MS).toISOString();
    const counted = countingProvider();
    const before = await store.getSchedule();
    const result = await runContentAutomation({
      store,
      loadContext: async () => catalogContext(),
      provider: counted.provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(isCycleDue(before.next_publish_at, AUTOMATION_NOW)).toBe(false);
    expect(result.execution.status).toBe("NOT_DUE");
    expect(result.due).toBe(false);
    expect(counted.calls()).toBe(0);
    expect(store.pipeline.runs.size).toBe(0);
    expect(await store.getSchedule()).toEqual(before);
  });

  it("runs exactly one cycle when due", async () => {
    const store = automationStore();
    const counted = countingProvider();
    const result = await runContentAutomation({
      store,
      loadContext: async () => catalogContext(),
      provider: counted.provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(result.execution.status).toBe("COMPLETED_DRY_RUN");
    expect(result.due).toBe(true);
    expect(counted.calls()).toBe(1);
    expect(result.execution.drafts_generated).toBe(1);
    expect(store.pipeline.runs.size).toBe(1);
  });

  it("does not advance the publication clock after a failed generation", async () => {
    const store = automationStore();
    const before = await store.getSchedule();
    const result = await runContentAutomation({
      store,
      loadContext: async () => catalogContext(),
      provider: {
        id: "fake",
        generateDraft: async () => {
          throw new Error("provider unavailable");
        },
      },
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(result.execution.status).toBe("ERROR");
    expect(await store.getSchedule()).toEqual(before);
    expect(store.schedule.last_successful_publish_at).toBeNull();
  });

  it("does not advance the publication clock after a successful dry-run", async () => {
    const store = automationStore();
    const before = await store.getSchedule();
    const result = await runContentAutomation({
      store,
      loadContext: async () => catalogContext(),
      provider: countingProvider().provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(result.execution.status).toBe("COMPLETED_DRY_RUN");
    expect(result.publish_attempted).toBe(false);
    expect(result.publish_succeeded).toBe(false);
    expect(await store.getSchedule()).toEqual(before);
    expect(store.schedule.last_successful_publish_at).toBeNull();
  });
});
