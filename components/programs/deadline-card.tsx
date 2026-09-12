import { programDeadlineDisplay } from "@/lib/programs/deadline-display";
import { cn } from "@/lib/utils/cn";
import type { Program } from "@/types/program";

export function ProgramDeadlineCard({
  program,
  now,
  variant = "card",
}: {
  program: Program;
  now?: Date;
  variant?: "card" | "panel";
}) {
  const display = programDeadlineDisplay(program, now);
  if (!display) {
    return null;
  }

  const nested =
    display.urgency === "elevated" ||
    display.urgency === "urgent" ||
    display.urgency === "past";
  const toneClass = {
    info: "border-border bg-card",
    elevated: "border-amber-200 bg-amber-50",
    urgent: "border-accent/40 bg-accent/10",
    past: "border-border bg-muted/60",
  }[display.urgency];

  const content = (
    <>
      <h2
        id="program-deadline-heading"
        className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
      >
        {display.label}
      </h2>
      <p
        className={cn(
          "mt-3 font-serif font-semibold tracking-tight text-foreground",
          variant === "panel" ? "text-3xl uppercase sm:text-4xl" : "text-2xl sm:text-3xl",
        )}
      >
        <time dateTime={display.dateIso}>{display.dateLabel}</time>
      </p>
      {display.daysRemainingLabel ? (
        <p className="mt-2 text-base font-medium text-foreground">{display.daysRemainingLabel}</p>
      ) : null}
      {display.ended ? (
        <p className="mt-1 text-sm text-muted-foreground">This listed program period has ended.</p>
      ) : null}
      {display.periodLabel ? (
        <p className="mt-3 text-sm text-muted-foreground">{display.periodLabel}</p>
      ) : null}
      {display.progressPercent !== null ? (
        <div className="mt-4">
          <div
            role="progressbar"
            aria-label="Program period progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={display.progressPercent}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${display.progressPercent}%` }}
            />
          </div>
        </div>
      ) : null}
    </>
  );

  if (variant === "panel" && !nested) {
    return (
      <section
        aria-label={display.summary}
        aria-labelledby="program-deadline-heading"
      >
        {content}
      </section>
    );
  }

  return (
    <section
      aria-label={display.summary}
      aria-labelledby="program-deadline-heading"
      className={cn(
        "rounded-2xl border px-5 py-4 sm:px-6",
        variant === "card" && "shadow-[0_1px_2px_rgba(28,25,23,0.05)]",
        variant === "panel" && "rounded-xl px-4 py-4",
        toneClass,
      )}
    >
      {content}
    </section>
  );
}
