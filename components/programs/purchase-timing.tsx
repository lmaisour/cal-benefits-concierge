import { purchaseTimingDisplay } from "@/lib/programs/purchase-timing";
import { cn } from "@/lib/utils/cn";
import type { Program } from "@/types/program";

export function ProgramPurchaseTiming({
  program,
  variant = "card",
}: {
  program: Program;
  variant?: "card" | "panel";
}) {
  const display = purchaseTimingDisplay({
    purchase_before_approval_allowed: program.purchase_before_approval_allowed,
    preapproval_required: program.preapproval_required,
  });
  if (!display) {
    return null;
  }

  const warning = display.tone === "warning";
  const boxed = variant === "card" || warning;

  return (
    <aside
      role={warning ? "alert" : undefined}
      aria-labelledby="program-purchase-timing-heading"
      className={cn(
        boxed && "rounded-2xl border px-5 py-4 sm:px-6",
        boxed && warning && "border-accent/40 bg-accent/10",
        boxed && !warning && "border-border bg-card",
        variant === "panel" && warning && "rounded-xl px-4 py-4",
      )}
    >
      <h2
        id="program-purchase-timing-heading"
        className={cn(
          "font-semibold tracking-tight text-foreground",
          warning
            ? "font-serif text-lg font-semibold uppercase tracking-wide"
            : "text-sm font-medium text-muted-foreground",
        )}
      >
        {display.heading}
      </h2>
      <p className="mt-2 text-base leading-relaxed text-foreground">{display.body}</p>
      {display.supporting ? (
        <p className="mt-2 text-sm text-muted-foreground">{display.supporting}</p>
      ) : null}
      {display.preapprovalLabel ? (
        <p className="mt-2 text-sm text-muted-foreground">{display.preapprovalLabel}</p>
      ) : null}
    </aside>
  );
}
