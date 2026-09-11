import { processTimelineSteps, type ProcessTimelineStep } from "@/lib/programs/process-timeline";

export function ProgramProcessTimeline({
  steps,
}: {
  steps: ProcessTimelineStep[] | null | undefined;
}) {
  const usable = processTimelineSteps(steps);
  if (!usable) {
    return null;
  }

  return (
    <section
      aria-labelledby="program-process-timeline-heading"
      className="rounded-2xl border border-border bg-card px-5 py-5 shadow-[0_1px_2px_rgba(28,25,23,0.05)] sm:px-6"
    >
      <h2
        id="program-process-timeline-heading"
        className="font-serif text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
      >
        How the process works
      </h2>
      <ol className="mt-4 space-y-4">
        {usable.map((step, index) => (
          <li key={`${index}-${step.title}`} className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-hero text-sm font-semibold text-primary"
            >
              {index + 1}
            </span>
            <div>
              <p className="font-semibold text-foreground">{step.title}</p>
              {step.detail ? (
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
