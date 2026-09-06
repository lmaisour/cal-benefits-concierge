import type { ProgramLocation } from "@/types/program";
import { LOCATION_TYPE_LABELS } from "@/lib/programs/labels";

export function LocationCoverage({
  statewide,
  locations,
}: {
  statewide: boolean;
  locations: ProgramLocation[];
}) {
  const grouped = new Map<string, string[]>();
  for (const location of locations) {
    const current = grouped.get(location.location_type) ?? [];
    current.push(location.location_value);
    grouped.set(location.location_type, current);
  }

  return (
    <div className="space-y-2 text-foreground">
      {statewide ? <p>Statewide in California</p> : null}
      {(["ZIP", "COUNTY", "CITY", "ELECTRIC_UTILITY", "GAS_UTILITY"] as const).map(
        (type) => {
          const values = grouped.get(type);
          if (!values || values.length === 0) {
            return null;
          }
          return (
            <p key={type}>
              {LOCATION_TYPE_LABELS[type]}: {values.join(", ")}
            </p>
          );
        },
      )}
      {!statewide &&
      !grouped.has("ZIP") &&
      !grouped.has("COUNTY") &&
      !grouped.has("CITY") &&
      !grouped.has("ELECTRIC_UTILITY") &&
      !grouped.has("GAS_UTILITY") ? (
        <p>Geographic coverage is listed as California, but is not statewide.</p>
      ) : null}
    </div>
  );
}
