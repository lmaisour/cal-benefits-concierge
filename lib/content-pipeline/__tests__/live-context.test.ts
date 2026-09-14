import { describe, expect, it } from "vitest";
import { loadLivePipelineContext, recordsFromLiveRows } from "@/lib/content-pipeline/live-context";
import type { ProgramRow } from "@/types/database";
import { createFakeSupabase } from "./fake-supabase";

const LIVE_PROGRAM_ID = "11111111-1111-4111-8111-111111111111";

function liveProgram(overrides: Partial<ProgramRow> = {}): ProgramRow {
  return {
    id: LIVE_PROGRAM_ID,
    external_id: "CA-LIVE-1",
    name: "Live Rebate",
    slug: "live-rebate",
    administrator: "Live Agency",
    consumer_headline: "A live rebate",
    administrator_display_name: "Live Agency",
    consumer_tags: null,
    category: "home-energy",
    subcategory: null,
    short_description: "Live",
    description: "Live program",
    benefit_summary: "A rebate",
    benefit_type: "REBATE",
    benefit_min: 100,
    benefit_max: 200,
    benefit_period: "one_time",
    status: "ACTIVE",
    official_url: "https://example.invalid/live",
    application_url: "https://example.invalid/live/apply",
    statewide: true,
    preapproval_required: false,
    purchase_before_approval_allowed: true,
    effective_start: "2026-01-01",
    effective_end: null,
    application_deadline: null,
    last_verified_at: "2026-09-10T00:00:00.000Z",
    confidence: "HIGH",
    featured: false,
    active: true,
    has_unmodeled_required_criteria: false,
    unmodeled_required_criteria_summary: null,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("live Supabase context loader", () => {
  it("maps live program row IDs and homepage-feature status", () => {
    const records = recordsFromLiveRows({
      programs: [liveProgram()],
      rules: [
        {
          id: "rule-1",
          program_id: LIVE_PROGRAM_ID,
          field: "household_income",
          operator: "less_than_or_equal",
          value: 50000,
          rule_group: 1,
          group_operator: "AND",
          required: true,
          explanation: "Income limits apply.",
          created_at: "2026-09-01T00:00:00.000Z",
        },
      ],
      locations: [
        {
          id: "loc-1",
          program_id: LIVE_PROGRAM_ID,
          location_type: "STATE",
          location_value: "CA",
          created_at: "2026-09-01T00:00:00.000Z",
        },
      ],
      sources: [
        {
          id: "src-1",
          program_id: LIVE_PROGRAM_ID,
          source_type: "GENERAL",
          organization: "Live Agency",
          url: "https://example.invalid/source",
          verified_at: "2026-09-10T00:00:00.000Z",
          notes: null,
          created_at: "2026-09-01T00:00:00.000Z",
        },
      ],
      content: [],
      faqs: [],
      briefs: [],
      evidence: [],
      homepageFeatures: [
        {
          program_id: LIVE_PROGRAM_ID,
          sort_order: 1,
          created_at: "2026-09-01T00:00:00.000Z",
          updated_at: "2026-09-01T00:00:00.000Z",
        },
      ],
    });

    expect(records).toHaveLength(1);
    expect(records[0]?.program_id).toBe(LIVE_PROGRAM_ID);
    expect(records[0]?.program.external_id).toBe("CA-LIVE-1");
    expect(records[0]?.program.featured).toBe(true);
    expect(records[0]?.rules[0]?.field).toBe("household_income");
    expect(records[0]?.sources[0]?.url).toBe("https://example.invalid/source");
  });

  it("loads a pipeline context from a Supabase client using live IDs", async () => {
    const client = createFakeSupabase({
      tables: {
        programs: [liveProgram()],
        program_rules: [],
        program_locations: [],
        program_sources: [],
        program_content: [],
        program_faqs: [],
        content_briefs: [],
        content_evidence: [],
        homepage_features: [],
      },
    });
    const context = await loadLivePipelineContext(client);
    expect(context.records[0]?.program_id).toBe(LIVE_PROGRAM_ID);
    expect(context.known_routes).toContain("/programs/live-rebate");
  });

  it("throws on a database load failure and does not invent catalog rows", async () => {
    const client = createFakeSupabase({
      errors: { programs: { message: "relation programs does not exist", code: "42P01" } },
    });
    await expect(loadLivePipelineContext(client)).rejects.toThrow(/Failed to load programs/);
  });
});
