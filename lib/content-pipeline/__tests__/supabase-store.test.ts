import { describe, expect, it } from "vitest";
import { CONTENT_PIPELINE_OPPORTUNITY_TYPE } from "@/lib/content-pipeline/types";
import { SupabaseContentPipelineStore } from "@/lib/content-pipeline/supabase-store";
import { createFakeSupabase } from "./fake-supabase";

const PROGRAM_ID = "22222222-2222-4222-8222-222222222222";

function opportunityInput() {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    opportunity_type: CONTENT_PIPELINE_OPPORTUNITY_TYPE,
    program_id: PROGRAM_ID,
    guide_id: null,
    proposed_slug: "live-rebate",
    proposed_title: "Live rebate",
    primary_keyword: "live rebate",
    secondary_keywords: [],
    score: 70,
    score_breakdown: { version: 1 as const, total: 70, components: [], notes: [] },
    discovery_reason: "test",
    status: "SELECTED" as const,
    next_eligible_at: null,
  };
}

describe("SupabaseContentPipelineStore", () => {
  it("creates and updates pipeline runs", async () => {
    const client = createFakeSupabase();
    const store = new SupabaseContentPipelineStore(client);
    const run = await store.createRun({
      id: "44444444-4444-4444-8444-444444444444",
      started_at: "2026-09-14T00:00:00.000Z",
    });
    expect(run.status).toBe("STARTED");
    expect(run.mode).toBe("DRY_RUN");
    const updated = await store.updateRun(run.id, {
      status: "COMPLETED",
      completed_at: "2026-09-14T00:01:00.000Z",
    });
    expect(updated.status).toBe("COMPLETED");
    expect(client.tables.content_pipeline_runs).toHaveLength(1);
  });

  it("upserts one opportunity per live program and reuses it", async () => {
    const client = createFakeSupabase();
    const store = new SupabaseContentPipelineStore(client);
    const first = await store.upsertOpportunity(opportunityInput());
    const second = await store.upsertOpportunity({
      ...opportunityInput(),
      id: "55555555-5555-4555-8555-555555555555",
      score: 81,
      status: "READY_FOR_REVIEW",
    });
    expect(second.id).toBe(first.id);
    expect(second.program_id).toBe(PROGRAM_ID);
    expect(second.score).toBe(81);
    expect(client.tables.content_opportunities).toHaveLength(1);
  });
});
