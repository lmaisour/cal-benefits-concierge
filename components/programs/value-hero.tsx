import { programValueHeroDisplay } from "@/lib/programs/value-hero";
import type { Program } from "@/types/program";

export function ProgramValueHero({ program }: { program: Program }) {
  const display = programValueHeroDisplay(program);
  if (!display) {
    return null;
  }

  return (
    <section
      aria-labelledby="program-value-hero-heading"
      className="rounded-2xl border border-border bg-card px-5 py-5 shadow-[0_1px_2px_rgba(28,25,23,0.05)] sm:px-6"
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
