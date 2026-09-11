import { purchaseTimingDisplay } from "@/lib/programs/purchase-timing";
import { cn } from "@/lib/utils/cn";
import type { Program } from "@/types/program";

export function ProgramPurchaseTiming({ program }: { program: Program }) {
  const display = purchaseTimingDisplay({
    purchase_before_approval_allowed: program.purchase_before_approval_allowed,
    preapproval_required: program.preapproval_required,
  });
  if (!display) {
    return null;
  }

  return (
    <aside
      role={display.tone === "warning" ? "alert" : undefined}
      aria-labelledby="program-purchase-timing-heading"
      className={cn(
        "rounded-2xl border px-5 py-4 sm:px-6",
        display.tone === "warning"
          ? "border-accent/40 bg-accent/10"
          : "border-border bg-card",
      )}
    >
      <h2
        id="program-purchase-timing-heading"
        className="font-serif text-xl font-semibold tracking-tight text-foreground"
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
