import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { buildCatalogContext } from "@/lib/content-pipeline/catalog";
import { handleContentPipelineDryRunRequest } from "@/lib/content-pipeline/dry-run-request";
import { FakeContentDraftProvider } from "@/lib/content-pipeline/generate-draft";
import { LivePipelineLoadError } from "@/lib/content-pipeline/live-context";
import { MemoryContentPipelineStore } from "@/lib/content-pipeline/store";
import { SupabaseContentPipelineStore } from "@/lib/content-pipeline/supabase-store";
import { createFakeSupabase } from "./fake-supabase";

const ORIGINAL_ENABLED = process.env.CONTENT_PIPELINE_ENABLED;
const ORIGINAL_SECRET = process.env.CONTENT_PIPELINE_SECRET;

function request(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/internal/content/dry-run", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: "{}",
  });
}

describe("content pipeline endpoint live wiring", () => {
  it("uses a live Supabase runtime instead of the static catalog path", async () => {
    process.env.CONTENT_PIPELINE_ENABLED = "true";
    process.env.CONTENT_PIPELINE_SECRET = "test-secret";
    const loadContext = vi.fn(async () => buildCatalogContext());
    const store = new MemoryContentPipelineStore();
    const createStore = vi.fn(() => store);

    const response = await handleContentPipelineDryRunRequest(
      request({ authorization: "Bearer test-secret" }),
      async () => {
        const context = await loadContext();
        return {
          context,
          store: createStore(),
          provider: new FakeContentDraftProvider(),
        };
      },
    );

    expect(response.status).toBe(200);
    expect(loadContext).toHaveBeenCalledTimes(1);
    expect(createStore).toHaveBeenCalledTimes(1);
    const route = readFileSync(
      path.resolve(__dirname, "../../../app/api/internal/content/dry-run/route.ts"),
      "utf8",
    );
    expect(route).toContain("createLivePipelineRuntime");
    expect(route).not.toContain("buildCatalogContext");
    expect(route).not.toContain("getMemoryContentPipelineStore");
    process.env.CONTENT_PIPELINE_ENABLED = ORIGINAL_ENABLED;
    process.env.CONTENT_PIPELINE_SECRET = ORIGINAL_SECRET;
  });

  it("records and returns ERROR when live Supabase loading fails without falling back", async () => {
    process.env.CONTENT_PIPELINE_ENABLED = "true";
    process.env.CONTENT_PIPELINE_SECRET = "test-secret";
    const client = createFakeSupabase();
    const store = new SupabaseContentPipelineStore(client);
    const catalogSpy = vi.fn();

    const response = await handleContentPipelineDryRunRequest(
      request({ authorization: "Bearer test-secret" }),
      async () => {
        try {
          throw new LivePipelineLoadError("Failed to load programs: boom");
        } catch (error) {
          const run = await store.createRun({
            id: "66666666-6666-4666-8666-666666666666",
            started_at: "2026-09-14T00:00:00.000Z",
          });
          await store.updateRun(run.id, {
            status: "ERROR",
            error_message: error instanceof Error ? error.message : "boom",
            completed_at: "2026-09-14T00:00:01.000Z",
          });
          catalogSpy();
          throw error;
        }
      },
    );

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.status).toBe("ERROR");
    expect(json.published).toBe(false);
    expect(json.selected_opportunity).toBeNull();
    expect(json.error).toMatch(/Failed to load programs/);
    expect(client.tables.content_pipeline_runs[0]?.status).toBe("ERROR");
    expect(catalogSpy).toHaveBeenCalledTimes(1);
    process.env.CONTENT_PIPELINE_ENABLED = ORIGINAL_ENABLED;
    process.env.CONTENT_PIPELINE_SECRET = ORIGINAL_SECRET;
  });
});
