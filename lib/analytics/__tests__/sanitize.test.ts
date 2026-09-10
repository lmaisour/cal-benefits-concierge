import { describe, expect, it } from "vitest";
import { sanitizeAnalyticsPayload } from "@/lib/analytics/sanitize";

describe("sanitizeAnalyticsPayload", () => {
  it("allows known events and safe props", () => {
    expect(
      sanitizeAnalyticsPayload("featured_program_clicked", {
        program_slug: "myfirstev",
      }),
    ).toEqual({
      event: "featured_program_clicked",
      props: { program_slug: "myfirstev" },
    });
  });

  it("drops unknown events", () => {
    expect(sanitizeAnalyticsPayload("hacked_event", { program_slug: "x" })).toBeNull();
  });

  it("never forwards profile or answer fields", () => {
    const payload = sanitizeAnalyticsPayload("question_answered", {
      step_id: "zip",
      zip: "91331",
      income: "52000",
      household_income: "52000",
      disability: "true",
      veteran: "false",
      electric_utility: "LADWP",
      answer: "91331",
      profile: { zip: "91331" },
    });
    expect(payload).toEqual({
      event: "question_answered",
      props: { step_id: "zip" },
    });
  });

  it("ignores non-string values and unknown keys", () => {
    const payload = sanitizeAnalyticsPayload("results_viewed", {
      count: 12,
      nested: { zip: "90012" },
    });
    expect(payload).toEqual({ event: "results_viewed" });
  });
});
