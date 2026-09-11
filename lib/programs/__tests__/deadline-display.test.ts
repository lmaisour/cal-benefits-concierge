import { describe, expect, it } from "vitest";
import { parseUtcCalendarDate, utcToday } from "@/lib/programs/calendar";
import { programDeadlineDisplay } from "@/lib/programs/deadline-display";
import type { ProgramStatus } from "@/types/program";

const NOW = new Date(Date.UTC(2026, 8, 11, 16, 0, 0)); // 2026-09-11 16:00 UTC

function display(
  overrides: {
    effective_start?: string | null;
    effective_end?: string | null;
    status?: ProgramStatus;
  } = {},
  now: Date = NOW,
) {
  return programDeadlineDisplay(
    {
      effective_start: overrides.effective_start ?? null,
      effective_end: "effective_end" in overrides ? (overrides.effective_end ?? null) : "2026-10-31",
      status: overrides.status ?? "ACTIVE",
    },
    now,
  );
}

describe("programDeadlineDisplay", () => {
  it("renders a future end date with days remaining and a neutral period label", () => {
    const result = display({ effective_end: "2026-10-31" });
    expect(result).not.toBeNull();
    expect(result?.dateLabel).toBe("October 31, 2026");
    expect(result?.daysRemaining).toBe(50);
    expect(result?.daysRemainingLabel).toBe("50 days remaining");
    expect(result?.label).toBe("Current program period ends");
    expect(result?.label.toLowerCase()).not.toContain("application deadline");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("application deadline");
  });

  it("uses informational treatment more than 30 days out", () => {
    const result = display({ effective_end: "2026-10-12" });
    expect(result?.daysRemaining).toBe(31);
    expect(result?.urgency).toBe("info");
  });

  it("elevates dates 8 to 30 days away", () => {
    expect(display({ effective_end: "2026-10-11" })?.urgency).toBe("elevated");
    expect(display({ effective_end: "2026-09-19" })?.daysRemaining).toBe(8);
    expect(display({ effective_end: "2026-09-19" })?.urgency).toBe("elevated");
  });

  it("marks dates within 7 days as urgent, including today", () => {
    const seven = display({ effective_end: "2026-09-18" });
    expect(seven?.daysRemaining).toBe(7);
    expect(seven?.urgency).toBe("urgent");

    const today = display({ effective_end: "2026-09-11" });
    expect(today?.daysRemaining).toBe(0);
    expect(today?.daysRemainingLabel).toBe("Ends today");
    expect(today?.urgency).toBe("urgent");

    const tomorrow = display({ effective_end: "2026-09-12" });
    expect(tomorrow?.daysRemaining).toBe(1);
    expect(tomorrow?.daysRemainingLabel).toBe("1 day remaining");
  });

  it("omits the prominent card when a past end date contradicts ACTIVE status", () => {
    const stillActive = display({
      effective_end: "2026-06-30",
      status: "ACTIVE",
    });
    expect(stillActive).toBeNull();
  });

  it("keeps ended treatment when a past date matches an unavailable status", () => {
    const expired = display({
      effective_end: "2026-09-01",
      status: "EXPIRED",
    });
    expect(expired?.daysRemaining).toBeNull();
    expect(expired?.ended).toBe(true);
    expect(expired?.urgency).toBe("past");
    expect(expired?.label).toBe("Program period ended");
  });

  it("returns null when the end date is missing", () => {
    expect(display({ effective_end: null })).toBeNull();
    expect(display({ effective_end: "   " })).toBeNull();
  });

  it("returns null for invalid calendar dates", () => {
    expect(display({ effective_end: "not-a-date" })).toBeNull();
    expect(display({ effective_end: "2026-02-31" })).toBeNull();
    expect(display({ effective_end: "2026-13-01" })).toBeNull();
    expect(parseUtcCalendarDate("2026-02-31")).toBeNull();
  });

  it("shows a program period and progress only when start and end both exist", () => {
    const withStart = display({
      effective_start: "2026-08-01",
      effective_end: "2026-10-31",
    });
    expect(withStart?.periodLabel).toBe("Program period: Aug 1, 2026 → Oct 31, 2026");
    expect(withStart?.progressPercent).toBe(45);

    const missingStart = display({
      effective_start: null,
      effective_end: "2026-10-31",
    });
    expect(missingStart?.periodLabel).toBeNull();
    expect(missingStart?.progressPercent).toBeNull();
  });

  it("uses UTC calendar days across timezone boundaries", () => {
    const justAfterUtcMidnight = new Date("2026-09-10T17:00:00-07:00");
    const justBeforeUtcMidnight = new Date("2026-09-10T16:59:59-07:00");
    expect(utcToday(justAfterUtcMidnight).toISOString()).toBe("2026-09-11T00:00:00.000Z");
    expect(utcToday(justBeforeUtcMidnight).toISOString()).toBe("2026-09-10T00:00:00.000Z");

    const after = display({ effective_end: "2026-09-11" }, justAfterUtcMidnight);
    const before = display({ effective_end: "2026-09-11" }, justBeforeUtcMidnight);
    expect(after?.daysRemaining).toBe(0);
    expect(before?.daysRemaining).toBe(1);
  });
});
