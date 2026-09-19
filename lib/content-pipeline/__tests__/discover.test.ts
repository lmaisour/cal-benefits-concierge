import { describe, expect, it } from "vitest";
import { discoverOpportunities } from "@/lib/content-pipeline/discover-opportunities";
import { goldContent, goldFaqs, makeRecord, NOW } from "./fixtures";

describe("discoverOpportunities", () => {
  it("includes active high-confidence programs with official sources", () => {
    const result = discoverOpportunities({
      records: [makeRecord()],
      now: NOW,
    });
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.external_id).toBe("TEST-REBATE-1");
    expect(result.skipped).toEqual([]);
  });

  it("excludes inactive programs", () => {
    const result = discoverOpportunities({
      records: [makeRecord({ program: { active: false } })],
      now: NOW,
    });
    expect(result.candidates).toEqual([]);
    expect(result.skipped[0]?.reason).toBe("INACTIVE");
  });

  it("excludes non-ACTIVE status", () => {
    const result = discoverOpportunities({
      records: [makeRecord({ program: { status: "PAUSED" } })],
      now: NOW,
    });
    expect(result.skipped[0]?.reason).toBe("STATUS_NOT_ACTIVE");
  });

  it("excludes LOW confidence", () => {
    const result = discoverOpportunities({
      records: [makeRecord({ program: { confidence: "LOW" } })],
      now: NOW,
    });
    expect(result.skipped[0]?.reason).toBe("LOW_CONFIDENCE");
  });

  it("excludes missing official sources", () => {
    const result = discoverOpportunities({
      records: [
        makeRecord({
          program: { official_url: "" as unknown as string },
          sources: [],
        }),
      ],
      now: NOW,
    });
    expect(result.skipped[0]?.reason).toBe("MISSING_OFFICIAL_SOURCE");
  });

  it("excludes obviously stale verification", () => {
    const result = discoverOpportunities({
      records: [
        makeRecord({
          program: { last_verified_at: "2026-08-01T00:00:00.000Z" },
        }),
      ],
      now: NOW,
    });
    expect(result.skipped[0]?.reason).toBe("STALE_VERIFICATION");
  });

  it("excludes gold-standard editorial completeness", () => {
    const result = discoverOpportunities({
      records: [makeRecord({ content: goldContent(), faqs: goldFaqs() })],
      now: NOW,
    });
    expect(result.skipped[0]?.reason).toBe("GOLD_STANDARD_COMPLETE");
  });

  it("excludes programs already attached to a published guide", () => {
    const publishedId = "ff7a190d-c5a9-494b-9182-6048b91104dd";
    const published = makeRecord({
      program_id: publishedId,
      program: {
        name: "BAR Consumer Assistance Program Vehicle Retirement",
        slug: "bar-vehicle-retirement",
        external_id: "CA-VEH-BAR-RETIRE",
        featured: true,
      },
    });
    const unpublished = makeRecord({
      program_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      program: {
        name: "Other Rebate",
        slug: "other-rebate",
        external_id: "TEST-OTHER-1",
      },
    });
    const result = discoverOpportunities({
      records: [published, unpublished],
      now: NOW,
      publishedProgramIds: [publishedId],
    });
    expect(result.skipped).toEqual([
      {
        external_id: "CA-VEH-BAR-RETIRE",
        slug: "bar-vehicle-retirement",
        reason: "ALREADY_PUBLISHED_GUIDE",
      },
    ]);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.program_id).toBe("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  });

  it("treats missing editorial content as an opportunity", () => {
    const result = discoverOpportunities({
      records: [makeRecord({ content: null, faqs: [] })],
      now: NOW,
    });
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.discovery_reason).toMatch(/incomplete/i);
  });
});
