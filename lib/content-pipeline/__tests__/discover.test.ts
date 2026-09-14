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

  it("treats missing editorial content as an opportunity", () => {
    const result = discoverOpportunities({
      records: [makeRecord({ content: null, faqs: [] })],
      now: NOW,
    });
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.discovery_reason).toMatch(/incomplete/i);
  });
});
