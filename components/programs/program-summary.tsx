import { ProgramDeadlineCard } from "@/components/programs/deadline-card";
import { ProgramPurchaseTiming } from "@/components/programs/purchase-timing";
import { programDeadlineDisplay } from "@/lib/programs/deadline-display";
import { purchaseTimingDisplay } from "@/lib/programs/purchase-timing";
import { programSummaryFacts } from "@/lib/programs/summary-facts";
import type { Program, ProgramLocation, ProgramRule } from "@/types/program";

export function ProgramSummary({
  program,
  rules,
  locations,
  now,
}: {
  program: Program;
  rules: ProgramRule[];
  locations: ProgramLocation[];
  now?: Date;
}) {
  const facts = programSummaryFacts({ program, rules, locations });
  const deadline = programDeadlineDisplay(program, now);
  const purchase = purchaseTimingDisplay({
    purchase_before_approval_allowed: program.purchase_before_approval_allowed,
    preapproval_required: program.preapproval_required,
  });

  if (!deadline && facts.length === 0 && !purchase) {
    return null;
  }

  return (
    <aside
      aria-labelledby="program-summary-heading"
      className="rounded-2xl border border-border bg-card px-6 py-6 lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto"
    >
      <h2
        id="program-summary-heading"
        className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
      >
        Program summary
      </h2>

      {deadline ? (
        <div className="mt-5 border-t border-border pt-5">
          <ProgramDeadlineCard program={program} now={now} variant="panel" />
        </div>
      ) : null}

      {facts.length > 0 ? (
        <dl className="mt-5 divide-y divide-border border-t border-border">
          {facts.map((fact) => (
            <div key={fact.label} className="py-3 first:pt-4 last:pb-0">
              <dt className="text-sm text-muted-foreground">{fact.label}</dt>
              <dd className="mt-1 text-base font-medium text-foreground">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {purchase ? (
        <div className="mt-5 border-t border-border pt-5">
          <ProgramPurchaseTiming program={program} variant="panel" />
        </div>
      ) : null}
    </aside>
  );
}
