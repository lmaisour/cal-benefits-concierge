import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AUTOMATION_CADENCE_MS, AUTOMATION_LOCK_KEY } from "@/lib/content-pipeline/automation-types";
import { handleContentAutomationRequest } from "@/lib/content-pipeline/automation-request";
import { classifyRetryability } from "@/lib/content-pipeline/automation-retry";
import { AutomationError } from "@/lib/content-pipeline/automation-types";
import { FakeContentDraftProvider } from "@/lib/content-pipeline/generate-draft";
import { runContentAutomation } from "@/lib/content-pipeline/run-automation";
import { isContentAutomationEnabled } from "@/lib/content-pipeline/automation-config";
import { FIXTURE_PROGRAM_ID, makeRecord } from "./fixtures";
import { createAutonomousPublishSqlHarness } from "./pglite-automation";
import {
  AUTOMATION_NOW,
  BAR_GUIDE_ID,
  BAR_PROGRAM_ID,
  BAR_PUBLISHED_AT,
  OTHER_PROGRAM_ID,
  automationStore,
  barRecord,
  catalogContext,
  memoryPublishStore,
  openaiCountingProvider,
  otherRecord,
  seedPublishedBar,
} from "./automation-helpers";

const OWNER_B = "22222222-2222-4222-8222-222222222222";
const HISTORICAL_RUN_ID = "c3758b8c-6ba7-42c1-abf1-7059246c9b42";

const ORIGINAL_AUTO_PUBLISH = process.env.CONTENT_AUTOMATION_PUBLISH_ENABLED;
const ORIGINAL_PIPELINE_PUBLISH = process.env.CONTENT_PIPELINE_PUBLISH_ENABLED;
const ORIGINAL_PROVIDER = process.env.CONTENT_PIPELINE_DRAFT_PROVIDER;
const ORIGINAL_LLM_KEY = process.env.CONTENT_PIPELINE_LLM_API_KEY;
const ORIGINAL_OPENAI_KEY = process.env.OPENAI_API_KEY;
const ORIGINAL_AUTOMATION_ENABLED = process.env.CONTENT_AUTOMATION_ENABLED;
const ORIGINAL_AUTOMATION_SECRET = process.env.CONTENT_AUTOMATION_SECRET;

function restoreEnv() {
  restoreVar("CONTENT_AUTOMATION_PUBLISH_ENABLED", ORIGINAL_AUTO_PUBLISH);
  restoreVar("CONTENT_PIPELINE_PUBLISH_ENABLED", ORIGINAL_PIPELINE_PUBLISH);
  restoreVar("CONTENT_PIPELINE_DRAFT_PROVIDER", ORIGINAL_PROVIDER);
  restoreVar("CONTENT_PIPELINE_LLM_API_KEY", ORIGINAL_LLM_KEY);
  restoreVar("OPENAI_API_KEY", ORIGINAL_OPENAI_KEY);
  restoreVar("CONTENT_AUTOMATION_ENABLED", ORIGINAL_AUTOMATION_ENABLED);
  restoreVar("CONTENT_AUTOMATION_SECRET", ORIGINAL_AUTOMATION_SECRET);
}

function restoreVar(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function enableAutonomousPublish() {
  process.env.CONTENT_AUTOMATION_PUBLISH_ENABLED = "true";
  process.env.CONTENT_PIPELINE_PUBLISH_ENABLED = "true";
  process.env.CONTENT_PIPELINE_DRAFT_PROVIDER = "openai";
  delete process.env.CONTENT_PIPELINE_LLM_API_KEY;
  delete process.env.OPENAI_API_KEY;
}

function expectedNextPublishAt(publishedAt: string): string {
  return new Date(new Date(publishedAt).getTime() + AUTOMATION_CADENCE_MS).toISOString();
}

describe("autonomous article publication", () => {
  beforeEach(() => {
    delete process.env.CONTENT_AUTOMATION_PUBLISH_ENABLED;
    delete process.env.CONTENT_PIPELINE_PUBLISH_ENABLED;
    delete process.env.CONTENT_PIPELINE_DRAFT_PROVIDER;
    delete process.env.CONTENT_PIPELINE_LLM_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    restoreEnv();
  });

  it("cannot publish when autonomous publication is disabled", async () => {
    process.env.CONTENT_AUTOMATION_PUBLISH_ENABLED = "false";
    process.env.CONTENT_PIPELINE_PUBLISH_ENABLED = "true";
    process.env.CONTENT_PIPELINE_DRAFT_PROVIDER = "openai";
    const store = automationStore();
    const publishStore = memoryPublishStore(store, [FIXTURE_PROGRAM_ID]);
    const counted = openaiCountingProvider();
    const result = await runContentAutomation({
      store,
      publishStore,
      loadContext: async () => catalogContext(),
      provider: counted.provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(result.execution.status).toBe("COMPLETED_DRY_RUN");
    expect(result.publish_attempted).toBe(false);
    expect(result.publish_succeeded).toBe(false);
    expect(publishStore.guides.size).toBe(0);
    expect(store.schedule.last_successful_publish_at).toBeNull();
  });

  it("cannot publish when the pipeline publish kill switch is disabled", async () => {
    process.env.CONTENT_AUTOMATION_PUBLISH_ENABLED = "true";
    process.env.CONTENT_PIPELINE_PUBLISH_ENABLED = "false";
    process.env.CONTENT_PIPELINE_DRAFT_PROVIDER = "openai";
    const store = automationStore();
    const publishStore = memoryPublishStore(store, [FIXTURE_PROGRAM_ID]);
    const counted = openaiCountingProvider();
    const result = await runContentAutomation({
      store,
      publishStore,
      loadContext: async () => catalogContext(),
      provider: counted.provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(result.execution.status).toBe("BLOCKED");
    expect(result.execution.error_code).toBe("publish_disabled");
    expect(result.publish_attempted).toBe(false);
    expect(counted.calls()).toBe(0);
    expect(publishStore.guides.size).toBe(0);
  });

  it("cannot run when automation is disabled", async () => {
    process.env.CONTENT_AUTOMATION_ENABLED = "false";
    process.env.CONTENT_AUTOMATION_SECRET = "automation-secret";
    enableAutonomousPublish();
    expect(isContentAutomationEnabled()).toBe(false);
    const response = await handleContentAutomationRequest(
      new Request("http://localhost/api/internal/content/automation", {
        method: "POST",
        headers: { authorization: "Bearer automation-secret", "content-type": "application/json" },
        body: "{}",
      }),
      async () => {
        throw new Error("runtime must not be created when automation is disabled");
      },
    );
    expect(response.status).toBe(403);
    const json = (await response.json()) as { error: string; publish_attempted: boolean };
    expect(json.error).toBe("content_automation_disabled");
    expect(json.publish_attempted).toBe(false);
  });

  it("fails closed when the real provider configuration is invalid", async () => {
    enableAutonomousPublish();
    const store = automationStore();
    await expect(
      runContentAutomation({
        store,
        publishStore: memoryPublishStore(store, [FIXTURE_PROGRAM_ID]),
        loadContext: async () => catalogContext(),
        now: AUTOMATION_NOW,
        leaseSeconds: 180,
      }),
    ).rejects.toMatchObject({ code: "invalid_provider" });
    expect(store.executions.size).toBe(0);
    expect(store.pipeline.runs.size).toBe(0);
    expect(store.schedule.last_successful_publish_at).toBeNull();
  });

  it("publishes exactly one guide on a successful execution", async () => {
    enableAutonomousPublish();
    const store = automationStore();
    const publishStore = memoryPublishStore(store, [FIXTURE_PROGRAM_ID]);
    const counted = openaiCountingProvider();
    const result = await runContentAutomation({
      store,
      publishStore,
      loadContext: async () => catalogContext(),
      provider: counted.provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(result.execution.status).toBe("PUBLISHED");
    expect(result.publish_attempted).toBe(true);
    expect(result.publish_succeeded).toBe(true);
    expect(result.execution.publish_attempted).toBe(true);
    expect(result.execution.publish_succeeded).toBe(true);
    expect(result.execution.guide_id).toBeTruthy();
    expect(result.execution.published_at).toBe(AUTOMATION_NOW.toISOString());
    expect(counted.calls()).toBe(1);
    expect(publishStore.guides.size).toBe(1);
    expect(store.pipeline.runs.size).toBe(1);
    const guide = [...publishStore.guides.values()][0];
    expect(guide?.published).toBe(true);
    expect(guide?.id).toBe(result.execution.guide_id);
  });

  it("excludes the existing BAR guide from selection and publication", async () => {
    enableAutonomousPublish();
    const store = automationStore();
    const publishStore = memoryPublishStore(store, [BAR_PROGRAM_ID, OTHER_PROGRAM_ID]);
    await seedPublishedBar(store, publishStore);
    const counted = openaiCountingProvider();
    const result = await runContentAutomation({
      store,
      publishStore,
      loadContext: async () => catalogContext([barRecord(), otherRecord()]),
      provider: counted.provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(result.execution.status).toBe("PUBLISHED");
    expect(result.execution.program_id).toBe(OTHER_PROGRAM_ID);
    expect(result.execution.guide_id).not.toBe(BAR_GUIDE_ID);
    expect(publishStore.guides.size).toBe(2);
    const bar = publishStore.guides.get(BAR_GUIDE_ID);
    expect(bar?.slug).toBe("bar-vehicle-retirement");
    expect(bar?.published_at).toBe(BAR_PUBLISHED_AT);
    expect(bar?.body).toContain("Existing BAR guide.");
  });

  it("does not treat the existing BAR guide as an unreconciled autonomous publication", async () => {
    enableAutonomousPublish();
    const store = automationStore();
    const publishStore = memoryPublishStore(store, [BAR_PROGRAM_ID, OTHER_PROGRAM_ID]);
    await seedPublishedBar(store, publishStore);
    const prior = await store.createExecution({
      id: "99999999-9999-4999-8999-999999999999",
      started_at: "2026-09-18T00:00:00.000Z",
      trigger: "MANUAL",
    });
    await store.updateExecution(prior.id, {
      opportunity_id: "8203c4ad-1fdc-4950-87d6-4608b8b81910",
      program_id: BAR_PROGRAM_ID,
      guide_id: BAR_GUIDE_ID,
      status: "COMPLETED_DRY_RUN",
    });
    const counted = openaiCountingProvider();
    const result = await runContentAutomation({
      store,
      publishStore,
      loadContext: async () => catalogContext([barRecord(), otherRecord()]),
      provider: counted.provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(counted.calls()).toBe(1);
    expect(result.execution.status).toBe("PUBLISHED");
    expect(result.execution.guide_id).not.toBe(BAR_GUIDE_ID);
    expect(publishStore.guides.get(BAR_GUIDE_ID)?.published_at).toBe(BAR_PUBLISHED_AT);
  });

  it("blocks publication when the authoritative fingerprint is stale", async () => {
    enableAutonomousPublish();
    const store = automationStore();
    const publishStore = memoryPublishStore(store, [FIXTURE_PROGRAM_ID]);
    const counted = openaiCountingProvider();
    let loads = 0;
    const result = await runContentAutomation({
      store,
      publishStore,
      loadContext: async () => {
        loads += 1;
        if (loads === 1) {
          return catalogContext();
        }
        return catalogContext([makeRecord({ program: { benefit_min: 1 } })]);
      },
      provider: counted.provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(counted.calls()).toBe(1);
    expect(result.execution.status).toBe("BLOCKED");
    expect(result.execution.error_code).toBe("stale_authoritative_state");
    expect(result.publish_attempted).toBe(false);
    expect(publishStore.guides.size).toBe(0);
    expect(store.schedule.last_successful_publish_at).toBeNull();
  });

  it("rebuilds the fingerprint immediately before publication and fails closed on mismatch", async () => {
    enableAutonomousPublish();
    const store = automationStore();
    const publishStore = memoryPublishStore(store, [FIXTURE_PROGRAM_ID]);
    const counted = openaiCountingProvider();
    let loads = 0;
    const result = await runContentAutomation({
      store,
      publishStore,
      loadContext: async () => {
        loads += 1;
        if (loads < 3) {
          return catalogContext();
        }
        return catalogContext([makeRecord({ program: { benefit_max: 1 } })]);
      },
      provider: counted.provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(loads).toBe(3);
    expect(counted.calls()).toBe(1);
    expect(result.execution.status).toBe("BLOCKED");
    expect(result.execution.error_code).toBe("stale_authoritative_state");
    expect(result.publish_attempted).toBe(false);
    expect(publishStore.guides.size).toBe(0);
  });

  it("blocks publication when the generated run has no fingerprint", async () => {
    enableAutonomousPublish();
    const store = automationStore();
    const publishStore = memoryPublishStore(store, [FIXTURE_PROGRAM_ID]);
    const original = store.pipeline.updateRun.bind(store.pipeline);
    store.pipeline.updateRun = async (id, patch) => {
      const next = await original(id, { ...patch, authoritative_state_fingerprint: null });
      next.authoritative_state_fingerprint = null;
      return next;
    };
    const result = await runContentAutomation({
      store,
      publishStore,
      loadContext: async () => catalogContext(),
      provider: openaiCountingProvider().provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(result.execution.status).toBe("BLOCKED");
    expect(result.execution.error_code).toBe("missing_authoritative_fingerprint");
    expect(result.publish_attempted).toBe(false);
    expect(publishStore.guides.size).toBe(0);
  });

  it("fails closed if the lease is lost immediately before publication", async () => {
    enableAutonomousPublish();
    const store = automationStore();
    const publishStore = memoryPublishStore(store, [FIXTURE_PROGRAM_ID]);
    const counted = openaiCountingProvider();
    let loads = 0;
    const result = await runContentAutomation({
      store,
      publishStore,
      loadContext: async () => {
        loads += 1;
        if (loads === 2) {
          const current = store.locks.get(AUTOMATION_LOCK_KEY);
          if (current) {
            current.expires_at = new Date(0).toISOString();
          }
          await store.acquireLock({
            lockKey: AUTOMATION_LOCK_KEY,
            ownerId: OWNER_B,
            leaseSeconds: 180,
            now: new Date(),
          });
        }
        return catalogContext();
      },
      provider: counted.provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
      renewEveryMs: 0,
    });
    expect(counted.calls()).toBe(1);
    expect(result.execution.status).toBe("ERROR");
    expect(result.execution.error_code).toBe("lease_lost");
    expect(result.publish_attempted).toBe(false);
    expect(publishStore.guides.size).toBe(0);
    expect(store.schedule.last_successful_publish_at).toBeNull();
  });

  it("does not publish when validation fails", async () => {
    enableAutonomousPublish();
    const store = automationStore();
    const publishStore = memoryPublishStore(store, [FIXTURE_PROGRAM_ID, OTHER_PROGRAM_ID]);
    const inner = new FakeContentDraftProvider();
    let calls = 0;
    const result = await runContentAutomation({
      store,
      publishStore,
      loadContext: async () => catalogContext(),
      provider: {
        id: "openai",
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
    expect(result.publish_attempted).toBe(false);
    expect(publishStore.guides.size).toBe(0);
    expect(store.schedule.last_successful_publish_at).toBeNull();
  });

  it("does not publish when the draft provider fails", async () => {
    enableAutonomousPublish();
    const store = automationStore();
    const publishStore = memoryPublishStore(store, [FIXTURE_PROGRAM_ID, OTHER_PROGRAM_ID]);
    let calls = 0;
    const result = await runContentAutomation({
      store,
      publishStore,
      loadContext: async () => catalogContext([makeRecord(), otherRecord()]),
      provider: {
        id: "openai",
        generateDraft: async () => {
          calls += 1;
          throw new Error("provider unavailable");
        },
      },
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(calls).toBe(1);
    expect(result.execution.status).toBe("ERROR");
    expect(result.execution.error_code).toBe("generation_failed");
    expect(result.publish_attempted).toBe(false);
    expect(publishStore.guides.size).toBe(0);
    expect(store.schedule.last_successful_publish_at).toBeNull();
  });

  it("does not advance the schedule when publication fails", async () => {
    enableAutonomousPublish();
    const store = automationStore();
    const publishStore = memoryPublishStore(store, [FIXTURE_PROGRAM_ID]);
    publishStore.injectFailure = "opportunity_attach";
    const before = await store.getSchedule();
    const result = await runContentAutomation({
      store,
      publishStore,
      loadContext: async () => catalogContext(),
      provider: openaiCountingProvider().provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(result.execution.status).toBe("ERROR");
    expect(result.execution.error_code).toBe("publish_failed");
    expect(result.publish_attempted).toBe(true);
    expect(result.publish_succeeded).toBe(false);
    expect(await store.getSchedule()).toEqual(before);
    expect(store.schedule.last_successful_publish_at).toBeNull();
  });

  it("advances the schedule exactly 48 hours after a confirmed publication", async () => {
    enableAutonomousPublish();
    const store = automationStore();
    const publishStore = memoryPublishStore(store, [FIXTURE_PROGRAM_ID]);
    const result = await runContentAutomation({
      store,
      publishStore,
      loadContext: async () => catalogContext(),
      provider: openaiCountingProvider().provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    const publishedAt = result.execution.published_at;
    expect(publishedAt).toBe(AUTOMATION_NOW.toISOString());
    expect(store.schedule.last_successful_publish_at).toBe(publishedAt);
    expect(store.schedule.next_publish_at).toBe(expectedNextPublishAt(publishedAt ?? ""));
    expect(store.schedule.next_publish_at).toBe("2026-09-21T00:00:00.000Z");
  });

  it("records guide ID and PUBLISHED status after success", async () => {
    enableAutonomousPublish();
    const store = automationStore();
    store.schedule.next_publish_at = new Date(0).toISOString();
    const publishStore = memoryPublishStore(store, [FIXTURE_PROGRAM_ID]);
    process.env.CONTENT_AUTOMATION_ENABLED = "true";
    process.env.CONTENT_AUTOMATION_SECRET = "automation-secret";
    const response = await handleContentAutomationRequest(
      new Request("http://localhost/api/internal/content/automation", {
        method: "POST",
        headers: { authorization: "Bearer automation-secret", "content-type": "application/json" },
        body: "{}",
      }),
      async () => ({
        store,
        publishStore,
        loadContext: async () => catalogContext(),
        provider: openaiCountingProvider().provider,
      }),
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      status: string;
      publish_attempted: boolean;
      publish_succeeded: boolean;
      guide_id: string | null;
      published_at: string | null;
    };
    expect(json.status).toBe("PUBLISHED");
    expect(json.publish_attempted).toBe(true);
    expect(json.publish_succeeded).toBe(true);
    expect(json.guide_id).toBeTruthy();
    expect(json.published_at).toBeTruthy();
    expect(JSON.stringify(json)).not.toContain("sk-");
  });

  it("recovers an already-published guide instead of creating a second one", async () => {
    enableAutonomousPublish();
    const store = automationStore();
    const publishStore = memoryPublishStore(store, [FIXTURE_PROGRAM_ID]);
    const first = await runContentAutomation({
      store,
      publishStore,
      loadContext: async () => catalogContext(),
      provider: openaiCountingProvider().provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(first.execution.status).toBe("PUBLISHED");
    store.schedule.last_successful_publish_at = null;
    store.schedule.next_publish_at = AUTOMATION_NOW.toISOString();
    const counted = openaiCountingProvider();
    const retry = await runContentAutomation({
      store,
      publishStore,
      loadContext: async () => catalogContext(),
      provider: counted.provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(counted.calls()).toBe(0);
    expect(retry.execution.status).toBe("PUBLISHED");
    expect(retry.publish_succeeded).toBe(true);
    expect(retry.execution.guide_id).toBe(first.execution.guide_id);
    expect(publishStore.guides.size).toBe(1);
    expect(store.schedule.last_successful_publish_at).toBe(first.execution.published_at);
  });

  it("does not publish a second guide if schedule reconciliation fails after publication", async () => {
    enableAutonomousPublish();
    const store = automationStore();
    const publishStore = memoryPublishStore(store, [FIXTURE_PROGRAM_ID]);
    const originalMark = store.markSuccessfulPublication.bind(store);
    store.markSuccessfulPublication = async () => {
      throw Object.assign(new Error("connection reset"), { code: "ECONNRESET" });
    };
    const first = await runContentAutomation({
      store,
      publishStore,
      loadContext: async () => catalogContext(),
      provider: openaiCountingProvider().provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(first.execution.status).toBe("ERROR");
    expect(first.publish_attempted).toBe(true);
    expect(first.publish_succeeded).toBe(false);
    expect(first.execution.guide_id).toBeTruthy();
    expect(publishStore.guides.size).toBe(1);
    expect(store.schedule.last_successful_publish_at).toBeNull();

    store.markSuccessfulPublication = originalMark;
    const counted = openaiCountingProvider();
    const retry = await runContentAutomation({
      store,
      publishStore,
      loadContext: async () => catalogContext(),
      provider: counted.provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(counted.calls()).toBe(0);
    expect(retry.execution.status).toBe("PUBLISHED");
    expect(retry.execution.guide_id).toBe(first.execution.guide_id);
    expect(publishStore.guides.size).toBe(1);
    expect(store.schedule.last_successful_publish_at).toBe(first.execution.published_at);
  });

  it("lets only one concurrent execution publish", async () => {
    enableAutonomousPublish();
    const store = automationStore();
    const publishStore = memoryPublishStore(store, [FIXTURE_PROGRAM_ID]);
    const counted = openaiCountingProvider();
    const [first, second] = await Promise.all([
      runContentAutomation({
        store,
        publishStore,
        loadContext: async () => catalogContext(),
        provider: counted.provider,
        now: AUTOMATION_NOW,
        leaseSeconds: 180,
      }),
      runContentAutomation({
        store,
        publishStore,
        loadContext: async () => catalogContext(),
        provider: counted.provider,
        now: AUTOMATION_NOW,
        leaseSeconds: 180,
      }),
    ]);
    const statuses = [first.execution.status, second.execution.status].sort();
    expect(statuses).toEqual(["LOCKED", "PUBLISHED"]);
    expect(counted.calls()).toBe(1);
    expect(publishStore.guides.size).toBe(1);
    const published = [first, second].find((result) => result.execution.status === "PUBLISHED");
    const locked = [first, second].find((result) => result.execution.status === "LOCKED");
    expect(published?.publish_succeeded).toBe(true);
    expect(locked?.publish_attempted).toBe(false);
  });

  it("cannot autonomously publish a historical pipeline run", async () => {
    enableAutonomousPublish();
    const store = automationStore();
    const publishStore = memoryPublishStore(store, [FIXTURE_PROGRAM_ID]);
    await store.pipeline.createRun({
      id: HISTORICAL_RUN_ID,
      started_at: "2026-09-18T00:00:00.000Z",
    });
    await store.pipeline.updateRun(HISTORICAL_RUN_ID, {
      status: "COMPLETED",
      completed_at: "2026-09-18T00:01:00.000Z",
      authoritative_state_fingerprint: null,
    });
    const result = await runContentAutomation({
      store,
      publishStore,
      loadContext: async () => catalogContext(),
      provider: openaiCountingProvider().provider,
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(result.execution.status).toBe("PUBLISHED");
    expect(result.execution.pipeline_run_id).not.toBe(HISTORICAL_RUN_ID);
    expect(result.execution.pipeline_run_id).toBeTruthy();
    expect(publishStore.guides.size).toBe(1);
  });

  it("does not attempt a second candidate after the first candidate fails", async () => {
    enableAutonomousPublish();
    const store = automationStore();
    const publishStore = memoryPublishStore(store, [FIXTURE_PROGRAM_ID, OTHER_PROGRAM_ID]);
    let calls = 0;
    const result = await runContentAutomation({
      store,
      publishStore,
      loadContext: async () => catalogContext([makeRecord(), otherRecord()]),
      provider: {
        id: "openai",
        generateDraft: async () => {
          calls += 1;
          throw new Error("provider unavailable");
        },
      },
      now: AUTOMATION_NOW,
      leaseSeconds: 180,
    });
    expect(calls).toBe(1);
    expect(result.execution.status).toBe("ERROR");
    expect(result.publish_attempted).toBe(false);
    expect(publishStore.guides.size).toBe(0);
    expect(store.pipeline.runs.size).toBe(1);
  });

  it("never retries stale, missing-fingerprint, or lost-lease publication failures", () => {
    expect(classifyRetryability(new AutomationError("stale_authoritative_state", "stale"))).toBe(
      "permanent",
    );
    expect(
      classifyRetryability(new AutomationError("missing_authoritative_fingerprint", "missing")),
    ).toBe("permanent");
    expect(classifyRetryability(new AutomationError("lease_lost", "lost"))).toBe("permanent");
    expect(classifyRetryability(new AutomationError("automation_publish_disabled", "off"))).toBe(
      "permanent",
    );
    expect(classifyRetryability(new AutomationError("already_published", "exists"))).toBe(
      "permanent",
    );
  });
});

describe("postgres autonomous publication locking", () => {
  it("publishes once, keeps BAR unchanged, and refuses a concurrent lease", async () => {
    const db = await createAutonomousPublishSqlHarness();
    const ownerA = "11111111-1111-4111-8111-111111111111";
    const ownerB = "22222222-2222-4222-8222-222222222222";
    const otherProgram = OTHER_PROGRAM_ID;
    const otherOpportunity = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const otherGuide = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const publishedAt = "2026-09-19T18:00:00.000Z";

    await db.query("INSERT INTO public.programs (id) VALUES ($1), ($2)", [
      BAR_PROGRAM_ID,
      otherProgram,
    ]);
    await db.query(
      `INSERT INTO public.guides (
        id, title, slug, seo_title, meta_description, excerpt, body, published, published_at
      ) VALUES ($1, 'BAR', 'bar-vehicle-retirement', 'BAR', 'BAR', 'BAR', 'Existing BAR guide.', TRUE, $2)`,
      [BAR_GUIDE_ID, BAR_PUBLISHED_AT],
    );
    await db.query(
      "INSERT INTO public.guide_programs (guide_id, program_id) VALUES ($1, $2)",
      [BAR_GUIDE_ID, BAR_PROGRAM_ID],
    );
    await db.query(
      `INSERT INTO public.content_opportunities (id, opportunity_type, program_id, guide_id, proposed_slug, status)
       VALUES ($1, 'PROGRAM_GUIDE', $2, $3, 'bar-vehicle-retirement', 'READY_FOR_REVIEW')`,
      ["8203c4ad-1fdc-4950-87d6-4608b8b81910", BAR_PROGRAM_ID, BAR_GUIDE_ID],
    );
    await db.query(
      `INSERT INTO public.content_opportunities (id, opportunity_type, program_id, proposed_slug, status)
       VALUES ($1, 'PROGRAM_GUIDE', $2, 'other-home-rebate', 'READY_FOR_REVIEW')`,
      [otherOpportunity, otherProgram],
    );

    const firstLock = await db.query<{ acquire_content_automation_lock: { acquired: boolean } }>(
      "SELECT public.acquire_content_automation_lock($1, $2::uuid, $3) AS acquire_content_automation_lock",
      [AUTOMATION_LOCK_KEY, ownerA, 180],
    );
    expect(firstLock.rows[0]?.acquire_content_automation_lock.acquired).toBe(true);

    const secondLock = await db.query<{ acquire_content_automation_lock: { acquired: boolean } }>(
      "SELECT public.acquire_content_automation_lock($1, $2::uuid, $3) AS acquire_content_automation_lock",
      [AUTOMATION_LOCK_KEY, ownerB, 180],
    );
    expect(secondLock.rows[0]?.acquire_content_automation_lock.acquired).toBe(false);

    const firstPublish = await db.query<{ result: { created: boolean; guide: { id: string } } }>(
      `SELECT public.publish_content_guide(
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL
      ) AS result`,
      [
        otherGuide,
        otherOpportunity,
        otherProgram,
        "Other Home Rebate",
        "other-home-rebate",
        "Other Home Rebate",
        "A rebate guide",
        "A rebate",
        "Overview\n\nA rebate.",
        publishedAt,
      ],
    );
    expect(firstPublish.rows[0]?.result.created).toBe(true);

    const retryPublish = await db.query<{ result: { created: boolean; guide: { id: string } } }>(
      `SELECT public.publish_content_guide(
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL
      ) AS result`,
      [
        otherGuide,
        otherOpportunity,
        otherProgram,
        "Other Home Rebate",
        "other-home-rebate",
        "Other Home Rebate",
        "A rebate guide",
        "A rebate",
        "Overview\n\nChanged body that must not replace the first publish.",
        "2026-09-21T00:00:00.000Z",
      ],
    );
    expect(retryPublish.rows[0]?.result.created).toBe(false);
    expect(retryPublish.rows[0]?.result.guide.id).toBe(otherGuide);

    await db.query(
      `UPDATE public.content_automation_schedule
       SET last_successful_publish_at = $1,
           next_publish_at = $1::timestamptz + interval '48 hours',
           updated_at = $1
       WHERE id = 'default'`,
      [publishedAt],
    );

    const guides = await db.query<{ id: string; slug: string; body: string; published_at: Date | string }>(
      "SELECT id, slug, body, published_at FROM public.guides ORDER BY slug",
    );
    expect(guides.rows).toHaveLength(2);
    const bar = guides.rows.find((row) => row.id === BAR_GUIDE_ID);
    expect(bar?.slug).toBe("bar-vehicle-retirement");
    expect(bar?.body).toBe("Existing BAR guide.");
    expect(new Date(String(bar?.published_at)).toISOString()).not.toBe(
      new Date(publishedAt).toISOString(),
    );
    const other = guides.rows.find((row) => row.id === otherGuide);
    expect(other?.id).toBe(otherGuide);
    expect(new Date(String(other?.published_at)).toISOString()).toBe(
      new Date(publishedAt).toISOString(),
    );

    const schedule = await db.query<{
      last_successful_publish_at: Date | string;
      next_publish_at: Date | string;
    }>("SELECT last_successful_publish_at, next_publish_at FROM public.content_automation_schedule");
    expect(new Date(schedule.rows[0]!.next_publish_at).toISOString()).toBe(
      expectedNextPublishAt(new Date(schedule.rows[0]!.last_successful_publish_at).toISOString()),
    );

    await db.query(
      `INSERT INTO public.content_automation_executions (
        id, status, trigger, publish_attempted, publish_succeeded, guide_id, published_at
      ) VALUES ($1, 'PUBLISHED', 'MANUAL', TRUE, TRUE, $2, $3)`,
      ["55555555-5555-4555-8555-555555555555", otherGuide, publishedAt],
    );

    await expect(
      db.query(
        `INSERT INTO public.content_automation_executions (id, status, trigger)
         VALUES ($1, 'NOT_A_STATUS', 'MANUAL')`,
        ["66666666-6666-4666-8666-666666666666"],
      ),
    ).rejects.toThrow();

    const owned = await db.query<{ owns_content_automation_lock: boolean }>(
      "SELECT public.owns_content_automation_lock($1, $2::uuid) AS owns_content_automation_lock",
      [AUTOMATION_LOCK_KEY, ownerA],
    );
    expect(owned.rows[0]?.owns_content_automation_lock).toBe(true);

    await db.close();
  });
});
