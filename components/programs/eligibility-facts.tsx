import { eligibilityHighlightFacts } from "@/lib/programs/eligibility-facts";
import type { Program, ProgramLocation, ProgramRule } from "@/types/program";

export function ProgramEligibilityFacts({
  program,
  rules,
  locations,
}: {
  program: Program;
  rules: ProgramRule[];
  locations: ProgramLocation[];
}) {
  const facts = eligibilityHighlightFacts({ program, rules, locations });
  if (facts.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="program-eligibility-facts-heading">
      <h2
        id="program-eligibility-facts-heading"
        className="font-serif text-lg font-semibold tracking-tight text-foreground sm:text-xl"
      >
        Key eligibility facts
      </h2>
      <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="rounded-2xl border border-border bg-card px-4 py-3 shadow-[0_1px_2px_rgba(28,25,23,0.04)]"
          >
            <dt className="text-sm font-medium text-muted-foreground">{fact.label}</dt>
            <dd className="mt-1 text-base font-semibold text-foreground">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
