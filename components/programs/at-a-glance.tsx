import { atAGlanceItems } from "@/lib/programs/at-a-glance";
import type { Program, ProgramLocation, ProgramRule } from "@/types/program";

export function ProgramAtAGlance({
  program,
  rules,
  locations,
}: {
  program: Program;
  rules: ProgramRule[];
  locations: ProgramLocation[];
}) {
  const items = atAGlanceItems({ program, rules, locations });
  if (items.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="program-at-a-glance-heading"
      className="rounded-2xl border border-border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(28,25,23,0.05)] sm:px-6"
    >
      <h2
        id="program-at-a-glance-heading"
        className="font-serif text-lg font-semibold tracking-tight text-foreground sm:text-xl"
      >
        At a glance
      </h2>
      <dl className="mt-3 divide-y divide-border">
        {items.map((item) => (
          <div
            key={item.label}
            className="grid gap-1 py-2.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4"
          >
            <dt className="text-sm font-medium text-muted-foreground">{item.label}</dt>
            <dd className="text-sm leading-relaxed text-foreground sm:text-base">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
