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
export type DeadlineKind = "application" | "period";

export type ProgramDeadlineDisplay = {
  kind: DeadlineKind;
  label: string;
  summary: string;
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
    application_deadline?: string | null;
    effective_start: string | null;
    effective_end: string | null;
    status: ProgramStatus;
  },
  now: Date = new Date(),
): ProgramDeadlineDisplay | null {
  const application = applicationDeadlineDisplay(input.application_deadline, now);
  if (application) {
    return application;
  }
  return periodDeadlineDisplay(input, now);
}

function applicationDeadlineDisplay(
  raw: string | null | undefined,
  now: Date,
): ProgramDeadlineDisplay | null {
  const deadline = parseUtcCalendarDate(raw ?? null);
  if (!deadline) {
    return null;
  }
  const today = utcToday(now);
  const daysRemaining = calendarDaysBetween(today, deadline);
  if (daysRemaining < 0) {
    // A passed application date is not a program expiration.
    return null;
  }

  let urgency: DeadlineUrgency;
  if (daysRemaining <= 7) {
    urgency = "urgent";
  } else if (daysRemaining <= 30) {
    urgency = "elevated";
  } else {
    urgency = "info";
  }

  const dateLabel = formatUtcCalendarDate(deadline);
  return {
    kind: "application",
    label: "Application deadline",
    summary: `Application deadline: ${dateLabel}`,
    dateLabel,
    dateIso: utcCalendarIso(deadline),
    daysRemaining,
    daysRemainingLabel:
      daysRemaining === 0
        ? "Due today"
        : daysRemaining === 1
          ? "1 day remaining"
          : `${daysRemaining} days remaining`,
    urgency,
    periodLabel: null,
    progressPercent: null,
    ended: false,
  };
}

function periodDeadlineDisplay(
  input: {
    effective_start: string | null;
    effective_end: string | null;
    status: ProgramStatus;
  },
  now: Date,
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

  const dateLabel = formatUtcCalendarDate(end);
  const label = ended ? "Program period ended" : "Current program period ends";
  return {
    kind: "period",
    label,
    summary: `${label}: ${dateLabel}`,
    dateLabel,
    dateIso: utcCalendarIso(end),
    daysRemaining: dateHasPassed ? null : daysRemaining,
    daysRemainingLabel,
    urgency,
    periodLabel,
    progressPercent,
    ended,
  };
}
