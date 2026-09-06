import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/programs/labels";
import { cn } from "@/lib/utils/cn";
import type { ProgramStatus } from "@/types/program";

const STATUS_CLASS: Record<ProgramStatus, string> = {
  ACTIVE: "border-primary/15 bg-hero text-primary",
  UPCOMING: "border-sky-200 bg-sky-50 text-sky-900",
  WAITLIST: "border-amber-200 bg-amber-50 text-amber-950",
  PAUSED: "border-border bg-muted text-foreground",
  FUNDING_EXHAUSTED: "border-border bg-muted text-foreground",
  UNCERTAIN: "border-border bg-muted text-foreground",
  EXPIRED: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: ProgramStatus }) {
  return (
    <Badge className={cn(STATUS_CLASS[status])}>
      <span className="sr-only">Status: </span>
      {statusLabel(status)}
    </Badge>
  );
}
