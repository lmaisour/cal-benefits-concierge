import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authorizeContentPipelineRequest } from "@/lib/content-pipeline/auth";
import { isAutoPublishEnabled, isContentPipelinePublishEnabled } from "@/lib/content-pipeline/config";
import { buildCatalogContext } from "@/lib/content-pipeline/catalog";
import { handleContentPipelineDryRunRequest } from "@/lib/content-pipeline/dry-run-request";
import { FakeContentDraftProvider } from "@/lib/content-pipeline/generate-draft";
import { MemoryContentPipelineStore, resetMemoryContentPipelineStore } from "@/lib/content-pipeline/store";

const ORIGINAL_ENABLED = process.env.CONTENT_PIPELINE_ENABLED;
const ORIGINAL_SECRET = process.env.CONTENT_PIPELINE_SECRET;
const ORIGINAL_PROVIDER = process.env.CONTENT_PIPELINE_DRAFT_PROVIDER;

function testRuntime() {
  return {
    context: buildCatalogContext(),
    store: new MemoryContentPipelineStore(),
    provider: new FakeContentDraftProvider(),
  };
}

function request(headers: Record<string, string> = {}, body: unknown = {}) {
  return new Request("http://localhost/api/internal/content/dry-run", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("content pipeline endpoint auth", () => {
  beforeEach(() => {
    resetMemoryContentPipelineStore();
    process.env.CONTENT_PIPELINE_DRAFT_PROVIDER = "fake";
  });

  afterEach(() => {
    if (ORIGINAL_ENABLED === undefined) {
      delete process.env.CONTENT_PIPELINE_ENABLED;
    } else {
      process.env.CONTENT_PIPELINE_ENABLED = ORIGINAL_ENABLED;
    }
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.CONTENT_PIPELINE_SECRET;
    } else {
      process.env.CONTENT_PIPELINE_SECRET = ORIGINAL_SECRET;
    }
    if (ORIGINAL_PROVIDER === undefined) {
      delete process.env.CONTENT_PIPELINE_DRAFT_PROVIDER;
    } else {
      process.env.CONTENT_PIPELINE_DRAFT_PROVIDER = ORIGINAL_PROVIDER;
    }
    resetMemoryContentPipelineStore();
  });

  it("keeps auto-publish false unless CONTENT_AUTOMATION_PUBLISH_ENABLED is true", () => {
    const previousUnused = process.env.AUTO_PUBLISH_ENABLED;
    const previousAuto = process.env.CONTENT_AUTOMATION_PUBLISH_ENABLED;
    process.env.AUTO_PUBLISH_ENABLED = "true";
    delete process.env.CONTENT_AUTOMATION_PUBLISH_ENABLED;
    expect(isAutoPublishEnabled()).toBe(false);
    process.env.CONTENT_AUTOMATION_PUBLISH_ENABLED = "true";
    expect(isAutoPublishEnabled()).toBe(true);
    if (previousUnused === undefined) {
      delete process.env.AUTO_PUBLISH_ENABLED;
    } else {
      process.env.AUTO_PUBLISH_ENABLED = previousUnused;
    }
    if (previousAuto === undefined) {
      delete process.env.CONTENT_AUTOMATION_PUBLISH_ENABLED;
    } else {
      process.env.CONTENT_AUTOMATION_PUBLISH_ENABLED = previousAuto;
    }
  });

  it("keeps the publish kill switch off by default", () => {
    const previous = process.env.CONTENT_PIPELINE_PUBLISH_ENABLED;
    delete process.env.CONTENT_PIPELINE_PUBLISH_ENABLED;
    expect(isContentPipelinePublishEnabled()).toBe(false);
    process.env.CONTENT_PIPELINE_PUBLISH_ENABLED = "true";
    expect(isContentPipelinePublishEnabled()).toBe(true);
    if (previous === undefined) {
      delete process.env.CONTENT_PIPELINE_PUBLISH_ENABLED;
    } else {
      process.env.CONTENT_PIPELINE_PUBLISH_ENABLED = previous;
    }
  });

  it("rejects the dry-run when the pipeline is disabled", async () => {
    process.env.CONTENT_PIPELINE_ENABLED = "false";
    process.env.CONTENT_PIPELINE_SECRET = "test-secret";
    const auth = authorizeContentPipelineRequest(
      request({ authorization: "Bearer test-secret" }),
    );
    expect(auth).toEqual({ ok: false, status: 403, error: "content_pipeline_disabled" });

    const response = await handleContentPipelineDryRunRequest(
      request({ authorization: "Bearer test-secret" }),
      async () => testRuntime(),
    );
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.published).toBe(false);
    expect(json.error).toBe("content_pipeline_disabled");
  });

  it("rejects missing or invalid secrets even when enabled", async () => {
    process.env.CONTENT_PIPELINE_ENABLED = "true";
    process.env.CONTENT_PIPELINE_SECRET = "test-secret";

    const missing = await handleContentPipelineDryRunRequest(request(), async () => testRuntime());
    expect(missing.status).toBe(401);

    const invalid = await handleContentPipelineDryRunRequest(
      request({ authorization: "Bearer wrong-secret" }),
      async () => testRuntime(),
    );
    expect(invalid.status).toBe(401);

    const sessionShortcut = await handleContentPipelineDryRunRequest(
      request({ cookie: "admin_session=not-enough" }),
      async () => testRuntime(),
    );
    expect(sessionShortcut.status).toBe(401);
  });

  it("accepts a valid server secret and returns a dry-run summary", async () => {
    process.env.CONTENT_PIPELINE_ENABLED = "true";
    process.env.CONTENT_PIPELINE_SECRET = "test-secret";
    const response = await handleContentPipelineDryRunRequest(
      request({ authorization: "Bearer test-secret" }),
      async () => testRuntime(),
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.published).toBe(false);
    expect(json.run_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(json).not.toHaveProperty("evidence");
    expect(JSON.stringify(json)).not.toContain("test-secret");
    expect(JSON.stringify(json)).not.toContain("SUPABASE_SECRET_KEY");
  });
});
