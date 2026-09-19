import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { handleContentPipelinePublishRequest } from "@/lib/content-pipeline/publish-request";
import { FakeContentDraftProvider } from "@/lib/content-pipeline/generate-draft";
import { MemoryGuidePublishStore } from "@/lib/content-pipeline/memory-publish-store";
import { runDryRunContentPipeline } from "@/lib/content-pipeline/run-pipeline";
import { MemoryContentPipelineStore } from "@/lib/content-pipeline/store";
import { makeRecord, NOW, FIXTURE_PROGRAM_ID } from "./fixtures";

const ORIGINAL_ENABLED = process.env.CONTENT_PIPELINE_ENABLED;
const ORIGINAL_SECRET = process.env.CONTENT_PIPELINE_SECRET;
const ORIGINAL_PUBLISH = process.env.CONTENT_PIPELINE_PUBLISH_ENABLED;

const knownRoutes = [
  "/",
  "/check",
  "/results",
  "/programs",
  "/guides",
  "/programs/test-home-rebate",
];

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/internal/content/publish", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function runtime() {
  const pipeline = new MemoryContentPipelineStore();
  const result = await runDryRunContentPipeline({
    context: {
      records: [makeRecord()],
      known_routes: knownRoutes,
      duplicates: { slugs: ["test-home-rebate"], titles: ["Test Home Rebate"] },
    },
    provider: new FakeContentDraftProvider(),
    store: pipeline,
    now: NOW,
  });
  return {
    result,
    store: new MemoryGuidePublishStore(pipeline, new Set([FIXTURE_PROGRAM_ID])),
  };
}

describe("content pipeline publish endpoint", () => {
  beforeEach(() => {
    process.env.CONTENT_PIPELINE_DRAFT_PROVIDER = "fake";
  });

  afterEach(() => {
    if (ORIGINAL_ENABLED === undefined) delete process.env.CONTENT_PIPELINE_ENABLED;
    else process.env.CONTENT_PIPELINE_ENABLED = ORIGINAL_ENABLED;
    if (ORIGINAL_SECRET === undefined) delete process.env.CONTENT_PIPELINE_SECRET;
    else process.env.CONTENT_PIPELINE_SECRET = ORIGINAL_SECRET;
    if (ORIGINAL_PUBLISH === undefined) delete process.env.CONTENT_PIPELINE_PUBLISH_ENABLED;
    else process.env.CONTENT_PIPELINE_PUBLISH_ENABLED = ORIGINAL_PUBLISH;
  });

  it("rejects publish when the dedicated kill switch is off", async () => {
    process.env.CONTENT_PIPELINE_ENABLED = "true";
    process.env.CONTENT_PIPELINE_SECRET = "test-secret";
    process.env.CONTENT_PIPELINE_PUBLISH_ENABLED = "false";
    const { result, store } = await runtime();
    const response = await handleContentPipelinePublishRequest(
      request({ run_id: result.run.id }, { authorization: "Bearer test-secret" }),
      async () => store,
    );
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.published).toBe(false);
    expect(json.error).toBe("content_pipeline_publish_disabled");
    expect(store.guides.size).toBe(0);
  });

  it("rejects missing secrets even when publish is enabled", async () => {
    process.env.CONTENT_PIPELINE_ENABLED = "true";
    process.env.CONTENT_PIPELINE_SECRET = "test-secret";
    process.env.CONTENT_PIPELINE_PUBLISH_ENABLED = "true";
    const response = await handleContentPipelinePublishRequest(
      request({ run_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }),
      async () => new MemoryGuidePublishStore(new MemoryContentPipelineStore(), new Set()),
    );
    expect(response.status).toBe(401);
  });

  it("publishes from a run id without accepting article content", async () => {
    process.env.CONTENT_PIPELINE_ENABLED = "true";
    process.env.CONTENT_PIPELINE_SECRET = "test-secret";
    process.env.CONTENT_PIPELINE_PUBLISH_ENABLED = "true";
    const { result, store } = await runtime();
    const response = await handleContentPipelinePublishRequest(
      request(
        {
          run_id: result.run.id,
          title: "Hacked title",
          body: "Hacked body",
        },
        { authorization: "Bearer test-secret" },
      ),
      async () => store,
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.published).toBe(true);
    expect(json.slug).toBe(result.opportunity?.proposed_slug);
    const guide = [...store.guides.values()][0];
    expect(guide.title).toBe(result.draft?.h1);
    expect(guide.body).not.toContain("Hacked body");
  });

  it("wires the live route to the supabase publisher, not the in-memory store", () => {
    const route = readFileSync(
      path.resolve(__dirname, "../../../app/api/internal/content/publish/route.ts"),
      "utf8",
    );
    expect(route).toContain("SupabaseGuidePublishStore");
    expect(route).toContain("createSupabaseAdminClient");
    expect(route).not.toContain("MemoryGuidePublishStore");
    expect(route).not.toContain("getMemoryContentPipelineStore");
  });

  it("does not return raw database errors to the HTTP client", async () => {
    process.env.CONTENT_PIPELINE_ENABLED = "true";
    process.env.CONTENT_PIPELINE_SECRET = "test-secret";
    process.env.CONTENT_PIPELINE_PUBLISH_ENABLED = "true";
    const { result, store } = await runtime();
    store.persistPublishedGuide = async () => {
      throw new Error(
        'duplicate key value violates unique constraint "guides_slug_key"',
      );
    };
    const response = await handleContentPipelinePublishRequest(
      request({ run_id: result.run.id }, { authorization: "Bearer test-secret" }),
      async () => store,
    );
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.published).toBe(false);
    expect(json.error).toBe("content_pipeline_publish_failed");
    expect(JSON.stringify(json)).not.toContain("guides_slug_key");
    expect(JSON.stringify(json)).not.toContain("duplicate key");
  });
});
