import {
  calendarDaysBetween,
  formatUtcCalendarDate,
  formatUtcCalendarDateShort,
  parseUtcCalendarDate,
  utcCalendarIso,
  utcToday,
} from "@/lib/programs/calendar";
import type { ProgramStatus } from "@/types/program";

export type DeadlineUrgency = "info" | "elevated" | "urgent" | "past";

export type ProgramDeadlineDisplay = {
  label: string;
  dateLabel: string;
  dateIso: string;
  daysRemaining: number | null;
  daysRemainingLabel: string | null;
  urgency: DeadlineUrgency;
  periodLabel: string | null;
  progressPercent: number | null;
  ended: boolean;
};

const ENDED_STATUSES = new Set<ProgramStatus>([
  "EXPIRED",
  "FUNDING_EXHAUSTED",
  "PAUSED",
]);

export function programDeadlineDisplay(
  input: {
    effective_start: string | null;
    effective_end: string | null;
    status: ProgramStatus;
  },
  now: Date = new Date(),
): ProgramDeadlineDisplay | null {
  const end = parseUtcCalendarDate(input.effective_end);
  if (!end) {
    return null;
  }
  const start = parseUtcCalendarDate(input.effective_start);
  const today = utcToday(now);
  const daysRemaining = calendarDaysBetween(today, end);
  const endedByStatus = ENDED_STATUSES.has(input.status);
  const dateHasPassed = daysRemaining < 0;
  if (dateHasPassed && !endedByStatus) {
    return null;
  }
  const ended = dateHasPassed && endedByStatus;

  let urgency: DeadlineUrgency;
  if (dateHasPassed) {
    urgency = ended ? "past" : "info";
  } else if (daysRemaining <= 7) {
    urgency = "urgent";
  } else if (daysRemaining <= 30) {
    urgency = "elevated";
  } else {
    urgency = "info";
  }

  let daysRemainingLabel: string | null = null;
  if (!dateHasPassed) {
    if (daysRemaining === 0) {
      daysRemainingLabel = "Ends today";
    } else if (daysRemaining === 1) {
      daysRemainingLabel = "1 day remaining";
    } else {
      daysRemainingLabel = `${daysRemaining} days remaining`;
    }
  }

  const periodLabel =
    start && end
      ? `Program period: ${formatUtcCalendarDateShort(start)} → ${formatUtcCalendarDateShort(end)}`
      : null;

  let progressPercent: number | null = null;
  if (start && end && !dateHasPassed && end.getTime() > start.getTime()) {
    const elapsed = calendarDaysBetween(start, today);
    const total = calendarDaysBetween(start, end);
    if (total > 0) {
      progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
    }
  }

  return {
    label: ended ? "Program period ended" : "Current program period ends",
    dateLabel: formatUtcCalendarDate(end),
    dateIso: utcCalendarIso(end),
    daysRemaining: dateHasPassed ? null : daysRemaining,
    daysRemainingLabel,
    urgency,
    periodLabel,
    progressPercent,
    ended,
  };
}
