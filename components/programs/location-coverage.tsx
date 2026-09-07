import type { ProgramLocation } from "@/types/program";
import type { DirectoryPlace } from "@/lib/programs/location-context";
import { formatLocationCoverageLines } from "@/lib/programs/format-location-coverage";

export function LocationCoverage({
  statewide,
  locations,
  compact = false,
  focusPlace,
}: {
  statewide: boolean;
  locations: ProgramLocation[];
  compact?: boolean;
  focusPlace?: DirectoryPlace;
}) {
  const lines = formatLocationCoverageLines(statewide, locations, { focusPlace });

  return (
    <div className={compact ? "space-y-1 text-sm text-muted-foreground" : "space-y-2 text-foreground"}>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
