import { programValueHeroDisplay } from "@/lib/programs/value-hero";
import { cn } from "@/lib/utils/cn";
import type { Program } from "@/types/program";

export function ProgramValueHero({
  program,
  className,
}: {
  program: Program;
  className?: string;
}) {
  const display = programValueHeroDisplay(program);
  if (!display) {
    return null;
  }

  return (
    <section
      aria-labelledby="program-value-hero-heading"
      className={cn("min-w-0 pb-2", className)}
    >
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {display.kicker}
      </p>
      <h2
        id="program-value-hero-heading"
        className="mt-2 font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
      >
        {display.headline}
      </h2>
      {display.periodLabel ? (
        <p className="mt-2 text-sm text-muted-foreground">{display.periodLabel}</p>
      ) : null}
      {display.financingNotice ? (
        <p className="mt-3 text-sm font-medium text-muted-foreground">{display.financingNotice}</p>
      ) : null}
    </section>
  );
}
