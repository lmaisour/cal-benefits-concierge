import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AUTOMATION_CADENCE_MS, AUTOMATION_LOCK_KEY } from "@/lib/content-pipeline/automation-types";
import { handleContentAutomationCronRequest } from "@/lib/content-pipeline/automation-cron-request";
import { handleContentAutomationRequest } from "@/lib/content-pipeline/automation-request";
import { FIXTURE_PROGRAM_ID, makeRecord } from "./fixtures";
import {
  AUTOMATION_NOW,
  automationStore,
  catalogContext,
  memoryPublishStore,
  openaiCountingProvider,
} from "./automation-helpers";

const CRON_SECRET = "cron-test-secret";
const AUTOMATION_SECRET = "automation-secret";
const ORIGINAL_ENABLED = process.env.CONTENT_AUTOMATION_ENABLED;
const ORIGINAL_AUTOMATION_SECRET = process.env.CONTENT_AUTOMATION_SECRET;
const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;
const ORIGINAL_AUTO_PUBLISH = process.env.CONTENT_AUTOMATION_PUBLISH_ENABLED;
const ORIGINAL_PIPELINE_PUBLISH = process.env.CONTENT_PIPELINE_PUBLISH_ENABLED;
const ORIGINAL_PROVIDER = process.env.CONTENT_PIPELINE_DRAFT_PROVIDER;
const ORIGINAL_LLM_KEY = process.env.CONTENT_PIPELINE_LLM_API_KEY;
const ORIGINAL_OPENAI_KEY = process.env.OPENAI_API_KEY;

function restoreVar(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function restoreEnv() {
  restoreVar("CONTENT_AUTOMATION_ENABLED", ORIGINAL_ENABLED);
  restoreVar("CONTENT_AUTOMATION_SECRET", ORIGINAL_AUTOMATION_SECRET);
  restoreVar("CRON_SECRET", ORIGINAL_CRON_SECRET);
  restoreVar("CONTENT_AUTOMATION_PUBLISH_ENABLED", ORIGINAL_AUTO_PUBLISH);
  restoreVar("CONTENT_PIPELINE_PUBLISH_ENABLED", ORIGINAL_PIPELINE_PUBLISH);
  restoreVar("CONTENT_PIPELINE_DRAFT_PROVIDER", ORIGINAL_PROVIDER);
  restoreVar("CONTENT_PIPELINE_LLM_API_KEY", ORIGINAL_LLM_KEY);
  restoreVar("OPENAI_API_KEY", ORIGINAL_OPENAI_KEY);
}

function enableCronCaller() {
  process.env.CONTENT_AUTOMATION_ENABLED = "true";
  process.env.CONTENT_AUTOMATION_SECRET = AUTOMATION_SECRET;
  process.env.CRON_SECRET = CRON_SECRET;
}

function enableAutonomousPublish() {
  process.env.CONTENT_AUTOMATION_PUBLISH_ENABLED = "true";
  process.env.CONTENT_PIPELINE_PUBLISH_ENABLED = "true";
  process.env.CONTENT_PIPELINE_DRAFT_PROVIDER = "openai";
  delete process.env.CONTENT_PIPELINE_LLM_API_KEY;
  delete process.env.OPENAI_API_KEY;
}

function cronRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/internal/content/automation/cron", {
    method: "GET",
    headers,
  });
}

function authorizedCronRequest() {
  return cronRequest({ authorization: `Bearer ${CRON_SECRET}` });
}

function postRequest(headers: Record<string, string> = {}, body: unknown = {}) {
  return new Request("http://localhost/api/internal/content/automation", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function unusedRuntime() {
  return async () => {
    throw new Error("runtime must not be created when cron authentication fails");
  };
}

describe("content automation cron entry point", () => {
  beforeEach(() => {
    delete process.env.CONTENT_AUTOMATION_ENABLED;
    delete process.env.CONTENT_AUTOMATION_SECRET;
    delete process.env.CRON_SECRET;
    delete process.env.CONTENT_AUTOMATION_PUBLISH_ENABLED;
    delete process.env.CONTENT_PIPELINE_PUBLISH_ENABLED;
    delete process.env.CONTENT_PIPELINE_DRAFT_PROVIDER;
    delete process.env.CONTENT_PIPELINE_LLM_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    restoreEnv();
  });

  it("rejects a missing or wrong CRON_SECRET", async () => {
    enableCronCaller();

    const missing = await handleContentAutomationCronRequest(cronRequest(), unusedRuntime());
    expect(missing.status).toBe(401);
    expect((await missing.json()).error).toBe("content_automation_unauthorized");

    const wrong = await handleContentAutomationCronRequest(
      cronRequest({ authorization: "Bearer wrong-cron-secret" }),
      unusedRuntime(),
    );
    expect(wrong.status).toBe(401);
    expect((await wrong.json()).error).toBe("content_automation_unauthorized");
  });

  it("fails closed when CRON_SECRET is not configured", async () => {
    process.env.CONTENT_AUTOMATION_ENABLED = "true";
    process.env.CONTENT_AUTOMATION_SECRET = AUTOMATION_SECRET;
    delete process.env.CRON_SECRET;

    const emptyEnv = await handleContentAutomationCronRequest(
      cronRequest({ authorization: "Bearer undefined" }),
      unusedRuntime(),
    );
    expect(emptyEnv.status).toBe(401);

    const presentedEmpty = await handleContentAutomationCronRequest(
      cronRequest({ authorization: "Bearer " }),
      unusedRuntime(),
    );
    expect(presentedEmpty.status).toBe(401);
  });

  it("rejects spoofed Vercel cron headers without a valid CRON_SECRET", async () => {
    enableCronCaller();
    const spoofed = await handleContentAutomationCronRequest(
      cronRequest({
        "x-vercel-cron": "1",
        "x-vercel-cron-schedule": "0 0 * * *",
      }),
      unusedRuntime(),
    );
    expect(spoofed.status).toBe(401);
    expect((await spoofed.json()).error).toBe("content_automation_unauthorized");

    const spoofedWrongBearer = await handleContentAutomationCronRequest(
      cronRequest({
        authorization: `Bearer ${AUTOMATION_SECRET}`,
        "x-vercel-cron": "1",
        "x-vercel-cron-schedule": "0 0 1 1 *",
      }),
      unusedRuntime(),
    );
    expect(spoofedWrongBearer.status).toBe(401);
  });

  it("rejects cron invocation when automation is disabled", async () => {
    process.env.CONTENT_AUTOMATION_ENABLED = "false";
    process.env.CONTENT_AUTOMATION_SECRET = AUTOMATION_SECRET;
    process.env.CRON_SECRET = CRON_SECRET;
    const response = await handleContentAutomationCronRequest(
      authorizedCronRequest(),
      unusedRuntime(),
    );
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBe("content_automation_disabled");
    expect(json.publish_attempted).toBe(false);
  });

  it("rejects cron invocation when CONTENT_AUTOMATION_SECRET is not configured", async () => {
    process.env.CONTENT_AUTOMATION_ENABLED = "true";
    process.env.CRON_SECRET = CRON_SECRET;
    delete process.env.CONTENT_AUTOMATION_SECRET;
    const response = await handleContentAutomationCronRequest(
      authorizedCronRequest(),
      unusedRuntime(),
    );
    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("content_automation_unauthorized");
  });

  it("does not let CRON_SECRET authenticate the existing POST route", async () => {
    enableCronCaller();
    const response = await handleContentAutomationRequest(
      postRequest({ authorization: `Bearer ${CRON_SECRET}` }),
      unusedRuntime(),
    );
    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("content_automation_unauthorized");
  });

  it("keeps existing POST authentication unchanged", async () => {
    enableCronCaller();
    const missing = await handleContentAutomationRequest(postRequest(), unusedRuntime());
    expect(missing.status).toBe(401);

    const wrong = await handleContentAutomationRequest(
      postRequest({ authorization: "Bearer wrong-secret" }),
      unusedRuntime(),
    );
    expect(wrong.status).toBe(401);

    process.env.CONTENT_AUTOMATION_ENABLED = "false";
    const disabled = await handleContentAutomationRequest(
      postRequest({ authorization: `Bearer ${AUTOMATION_SECRET}` }),
      unusedRuntime(),
    );
    expect(disabled.status).toBe(403);
    expect((await disabled.json()).error).toBe("content_automation_disabled");
  });

  it("returns NOT_DUE without publishing when the persisted clock is not due", async () => {
    enableCronCaller();
    enableAutonomousPublish();
    const store = automationStore();
    store.schedule.next_publish_at = new Date(
      AUTOMATION_NOW.getTime() + AUTOMATION_CADENCE_MS,
    ).toISOString();
    const before = await store.getSchedule();
    const counted = openaiCountingProvider();
    const publishStore = memoryPublishStore(store, [FIXTURE_PROGRAM_ID]);
    const response = await handleContentAutomationCronRequest(
      authorizedCronRequest(),
      async () => ({
        store,
        publishStore,
        loadContext: async () => catalogContext(),
        provider: counted.provider,
      }),
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.status).toBe("NOT_DUE");
    expect(json.publish_attempted).toBe(false);
    expect(json.publish_succeeded).toBe(false);
    expect(counted.calls()).toBe(0);
    expect(publishStore.guides.size).toBe(0);
    expect(await store.getSchedule()).toEqual(before);
    expect([...store.executions.values()][0]?.trigger).toBe("CRON");
  });

  it("returns LOCKED when another owner holds the lease", async () => {
    enableCronCaller();
    enableAutonomousPublish();
    const store = automationStore();
    await store.acquireLock({
      lockKey: AUTOMATION_LOCK_KEY,
      ownerId: "22222222-2222-4222-8222-222222222222",
      leaseSeconds: 180,
      now: new Date(),
    });
    const counted = openaiCountingProvider();
    const publishStore = memoryPublishStore(store, [FIXTURE_PROGRAM_ID]);
    const response = await handleContentAutomationCronRequest(
      authorizedCronRequest(),
      async () => ({
        store,
        publishStore,
        loadContext: async () => catalogContext(),
        provider: counted.provider,
      }),
    );
    const json = await response.json();
    expect(json.status).toBe("LOCKED");
    expect(json.publish_attempted).toBe(false);
    expect(counted.calls()).toBe(0);
    expect(publishStore.guides.size).toBe(0);
    expect(store.schedule.last_successful_publish_at).toBeNull();
  });

  it("cannot publish when autonomous publication switches are disabled", async () => {
    enableCronCaller();
    process.env.CONTENT_AUTOMATION_PUBLISH_ENABLED = "false";
    process.env.CONTENT_PIPELINE_PUBLISH_ENABLED = "true";
    process.env.CONTENT_PIPELINE_DRAFT_PROVIDER = "openai";
    const store = automationStore();
    const publishStore = memoryPublishStore(store, [FIXTURE_PROGRAM_ID]);
    const counted = openaiCountingProvider();
    const autoOff = await handleContentAutomationCronRequest(
      authorizedCronRequest(),
      async () => ({
        store,
        publishStore,
        loadContext: async () => catalogContext(),
        provider: counted.provider,
      }),
    );
    const autoJson = await autoOff.json();
    expect(autoJson.status).toBe("COMPLETED_DRY_RUN");
    expect(autoJson.publish_attempted).toBe(false);
    expect(publishStore.guides.size).toBe(0);

    process.env.CONTENT_AUTOMATION_PUBLISH_ENABLED = "true";
    process.env.CONTENT_PIPELINE_PUBLISH_ENABLED = "false";
    const pipelineOffStore = automationStore();
    const pipelineOffPublish = memoryPublishStore(pipelineOffStore, [FIXTURE_PROGRAM_ID]);
    const pipelineOff = await handleContentAutomationCronRequest(
      authorizedCronRequest(),
      async () => ({
        store: pipelineOffStore,
        publishStore: pipelineOffPublish,
        loadContext: async () => catalogContext(),
        provider: openaiCountingProvider().provider,
      }),
    );
    const pipelineJson = await pipelineOff.json();
    expect(pipelineJson.status).toBe("BLOCKED");
    expect(pipelineJson.error).toBe("publish_disabled");
    expect(pipelineJson.publish_attempted).toBe(false);
    expect(pipelineOffPublish.guides.size).toBe(0);
    expect(pipelineOffStore.schedule.last_successful_publish_at).toBeNull();
  });

  it("fails closed on a stale authoritative fingerprint", async () => {
    enableCronCaller();
    enableAutonomousPublish();
    const store = automationStore();
    const publishStore = memoryPublishStore(store, [FIXTURE_PROGRAM_ID]);
    const counted = openaiCountingProvider();
    let loads = 0;
    const response = await handleContentAutomationCronRequest(
      authorizedCronRequest(),
      async () => ({
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
      }),
    );
    const json = await response.json();
    expect(counted.calls()).toBe(1);
    expect(json.status).toBe("BLOCKED");
    expect(json.error).toBe("stale_authoritative_state");
    expect(json.publish_attempted).toBe(false);
    expect(publishStore.guides.size).toBe(0);
    expect(store.schedule.last_successful_publish_at).toBeNull();
  });

  it("publishes at most one guide and does not publish again while the clock is not due", async () => {
    enableCronCaller();
    enableAutonomousPublish();
    const store = automationStore();
    const publishStore = memoryPublishStore(store, [FIXTURE_PROGRAM_ID]);
    const counted = openaiCountingProvider();
    const runtime = async () => ({
      store,
      publishStore,
      loadContext: async () => catalogContext(),
      provider: counted.provider,
    });

    const first = await handleContentAutomationCronRequest(authorizedCronRequest(), runtime);
    const firstJson = await first.json();
    expect(firstJson.status).toBe("PUBLISHED");
    expect(firstJson.publish_attempted).toBe(true);
    expect(firstJson.publish_succeeded).toBe(true);
    expect(firstJson.guide_id).toBeTruthy();
    expect(counted.calls()).toBe(1);
    expect(publishStore.guides.size).toBe(1);
    const publishedAt = firstJson.published_at as string;
    expect(store.schedule.last_successful_publish_at).toBe(publishedAt);
    expect(store.schedule.next_publish_at).toBe(
      new Date(new Date(publishedAt).getTime() + AUTOMATION_CADENCE_MS).toISOString(),
    );

    const second = await handleContentAutomationCronRequest(authorizedCronRequest(), runtime);
    const secondJson = await second.json();
    expect(secondJson.status).toBe("NOT_DUE");
    expect(secondJson.publish_attempted).toBe(false);
    expect(counted.calls()).toBe(1);
    expect(publishStore.guides.size).toBe(1);
  });

  it("sanitizes unexpected errors and never returns secrets", async () => {
    enableCronCaller();
    const response = await handleContentAutomationCronRequest(
      authorizedCronRequest(),
      async () => {
        throw new Error(
          "CRON_SECRET=cron-test-secret CONTENT_AUTOMATION_SECRET=automation-secret SUPABASE_SECRET_KEY=super-secret-value leaked sk-secretkeyvalue",
        );
      },
    );
    expect(response.status).toBe(500);
    const json = await response.json();
    const serialized = JSON.stringify(json);
    expect(json.error).toBe("content_automation_failed");
    expect(json.publish_attempted).toBe(false);
    expect(json.publish_succeeded).toBe(false);
    expect(serialized).not.toContain("cron-test-secret");
    expect(serialized).not.toContain("automation-secret");
    expect(serialized).not.toContain("super-secret-value");
    expect(serialized).not.toContain("SUPABASE_SECRET_KEY");
    expect(serialized).not.toContain("sk-secretkeyvalue");
    expect(serialized).not.toContain("CRON_SECRET");
    expect(serialized).not.toContain("CONTENT_AUTOMATION_SECRET");
  });
});
