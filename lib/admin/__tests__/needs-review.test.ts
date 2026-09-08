import { describe, expect, it } from "vitest";
import { programNeedsReview } from "@/lib/admin/needs-review";
import type { NeedsReviewInput } from "@/lib/admin/needs-review";

const now = Date.parse("2026-09-08T00:00:00.000Z");

function program(overrides: Partial<NeedsReviewInput> = {}): NeedsReviewInput {
  return {
    status: "ACTIVE",
    confidence: "HIGH",
    last_verified_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("programNeedsReview", () => {
  it("flags UNCERTAIN status", () => {
    expect(
      programNeedsReview(
        program({
          status: "UNCERTAIN",
          last_verified_at: "2026-09-07T00:00:00.000Z",
          confidence: "HIGH",
        }),
        now,
      ),
    ).toBe(true);
  });

  it("flags LOW confidence", () => {
    expect(
      programNeedsReview(
        program({
          confidence: "LOW",
          last_verified_at: "2026-09-07T00:00:00.000Z",
        }),
        now,
      ),
    ).toBe(true);
  });

  it("flags missing or stale last_verified_at", () => {
    expect(programNeedsReview(program({ last_verified_at: null }), now)).toBe(
      true,
    );
    expect(
      programNeedsReview(
        program({ last_verified_at: "2026-08-01T00:00:00.000Z" }),
        now,
      ),
    ).toBe(true);
    expect(programNeedsReview(program({ last_verified_at: "not-a-date" }), now)).toBe(
      true,
    );
  });

  it("does not flag a recently verified high-confidence active program", () => {
    expect(
      programNeedsReview(
        program({
          status: "ACTIVE",
          confidence: "MEDIUM",
          last_verified_at: "2026-08-10T00:00:00.000Z",
        }),
        now,
      ),
    ).toBe(false);
  });

  it("treats exactly 30 days as still current and 30 days plus one ms as stale", () => {
    const verified = "2026-08-09T00:00:00.000Z";
    expect(programNeedsReview(program({ last_verified_at: verified }), now)).toBe(
      false,
    );
    expect(
      programNeedsReview(
        program({ last_verified_at: verified }),
        now + 1,
      ),
    ).toBe(true);
  });
});
