import type { ProgramLocation } from "@/types/program";
import { formatLocationCoverageLines } from "@/lib/programs/format-location-coverage";

export function LocationCoverage({
  statewide,
  locations,
  compact = false,
}: {
  statewide: boolean;
  locations: ProgramLocation[];
  compact?: boolean;
}) {
  const lines = formatLocationCoverageLines(statewide, locations);

  return (
    <div className={compact ? "space-y-1 text-sm text-muted-foreground" : "space-y-2 text-foreground"}>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
