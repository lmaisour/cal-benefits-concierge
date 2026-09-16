import { describe, expect, it } from "vitest";
import { buildCatalogContext } from "@/lib/content-pipeline/catalog";
import { FakeContentDraftProvider } from "@/lib/content-pipeline/generate-draft";
import { runDryRunContentPipeline } from "@/lib/content-pipeline/run-pipeline";
import { MemoryContentPipelineStore } from "@/lib/content-pipeline/store";
import { SupabaseContentPipelineStore } from "@/lib/content-pipeline/supabase-store";
import type { ContentDraftProvider } from "@/lib/content-pipeline/types";
import { createFakeSupabase } from "./fake-supabase";
import { FIXTURE_PROGRAM_ID, makeRecord, NOW } from "./fixtures";

const knownRoutes = ["/", "/check", "/results", "/programs", "/guides", "/programs/test-home-rebate"];

function context(records = [makeRecord()]) {
  return {
    records,
    known_routes: knownRoutes,
    duplicates: {
      slugs: records.map((record) => record.program.slug),
      titles: records.map((record) => record.program.name),
    },
  };
}

describe("runDryRunContentPipeline", () => {
  it("completes a fake-provider dry run without publishing", async () => {
    const store = new MemoryContentPipelineStore();
    const result = await runDryRunContentPipeline({
      context: context(),
      provider: new FakeContentDraftProvider(),
      store,
      now: NOW,
    });
    expect(result.published).toBe(false);
    expect(result.run.mode).toBe("DRY_RUN");
    expect(result.run.status).toBe("COMPLETED");
    expect(result.opportunity?.status).toBe("READY_FOR_REVIEW");
    expect(result.validation?.passed).toBe(true);
    expect(result.draft?.source_claims.length).toBeGreaterThan(0);
    expect(result.evidence?.official_sources.length).toBeGreaterThan(0);
  });

  it("records provider failure as ERROR", async () => {
    const store = new MemoryContentPipelineStore();
    const provider: ContentDraftProvider = {
      id: "fake-failing",
      generateDraft: async () => {
        throw new Error("provider unavailable");
      },
    };
    const result = await runDryRunContentPipeline({
      context: context(),
      provider,
      store,
      now: NOW,
    });
    expect(result.run.status).toBe("ERROR");
    expect(result.opportunity?.status).toBe("ERROR");
    expect(result.run.error_message).toBe("provider unavailable");
    expect(result.published).toBe(false);
    expect(result.draft).toBeNull();
  });

  it("returns BLOCKED when no safe candidate exists", async () => {
    const store = new MemoryContentPipelineStore();
    const result = await runDryRunContentPipeline({
      context: context([makeRecord({ program: { active: false } })]),
      provider: new FakeContentDraftProvider(),
      store,
      now: NOW,
    });
    expect(result.run.status).toBe("BLOCKED");
    expect(result.opportunity).toBeNull();
    expect(result.published).toBe(false);
  });

  it("reuses the same opportunity on repeated runs", async () => {
    const store = new MemoryContentPipelineStore();
    const first = await runDryRunContentPipeline({
      context: context(),
      provider: new FakeContentDraftProvider(),
      store,
      now: NOW,
    });
    const second = await runDryRunContentPipeline({
      context: context(),
      provider: new FakeContentDraftProvider(),
      store,
      now: NOW,
    });
    expect(first.opportunity?.id).toBeTruthy();
    expect(second.opportunity?.id).toBe(first.opportunity?.id);
    expect(store.opportunities.size).toBe(1);
    expect(store.runs.size).toBe(2);
  });

  it("reuses one supabase opportunity row for the live program id", async () => {
    const client = createFakeSupabase();
    const store = new SupabaseContentPipelineStore(client);
    const first = await runDryRunContentPipeline({
      context: context(),
      provider: new FakeContentDraftProvider(),
      store,
      now: NOW,
    });
    const second = await runDryRunContentPipeline({
      context: context(),
      provider: new FakeContentDraftProvider(),
      store,
      now: NOW,
    });
    expect(first.opportunity?.program_id).toBe(FIXTURE_PROGRAM_ID);
    expect(second.opportunity?.id).toBe(first.opportunity?.id);
    expect(first.evidence?.program_id).toBe(FIXTURE_PROGRAM_ID);
    expect(client.tables.content_opportunities).toHaveLength(1);
    expect(client.tables.content_pipeline_runs).toHaveLength(2);
    expect(client.tables.program_content).toHaveLength(0);
    expect(client.tables.program_faqs).toHaveLength(0);
    expect(client.tables.guides ?? []).toHaveLength(0);
    expect(first.published).toBe(false);
  });

  it("can dry-run the verified program catalog with the fake provider", async () => {
    const store = new MemoryContentPipelineStore();
    const result = await runDryRunContentPipeline({
      context: buildCatalogContext(),
      provider: new FakeContentDraftProvider(),
      store,
      now: NOW,
    });
    expect(result.published).toBe(false);
    expect(result.run.status).toBe("COMPLETED");
    expect(result.opportunity?.status).toBe("READY_FOR_REVIEW");
    expect(result.validation?.passed).toBe(true);
  });
});
