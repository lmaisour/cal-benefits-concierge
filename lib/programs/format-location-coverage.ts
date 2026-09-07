import type { ProgramLocation } from "@/types/program";

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value.trim());
  }
  return result;
}

function formatCountyName(name: string): string {
  const trimmed = name.trim();
  if (/ county$/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed} County`;
}

function listAnd(items: string[]): string {
  if (items.length === 1) {
    return items[0];
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function formatLocationCoverageLines(
  statewide: boolean,
  locations: ProgramLocation[],
): string[] {
  const lines: string[] = [];

  if (statewide) {
    lines.push("Statewide in California");
  }

  const cities = unique(
    locations.filter((row) => row.location_type === "CITY").map((row) => row.location_value),
  );
  const counties = unique(
    locations.filter((row) => row.location_type === "COUNTY").map((row) => row.location_value),
  );
  const zips = unique(
    locations.filter((row) => row.location_type === "ZIP").map((row) => row.location_value),
  );
  const utilities = unique(
    locations
      .filter(
        (row) => row.location_type === "ELECTRIC_UTILITY" || row.location_type === "GAS_UTILITY",
      )
      .map((row) => row.location_value),
  );

  if (cities.length > 0) {
    lines.push(`Available in ${listAnd(cities)}`);
  }
  if (counties.length > 0) {
    lines.push(`Available in ${listAnd(counties.map(formatCountyName))}`);
  }
  if (zips.length > 0 && zips.length <= 6) {
    lines.push(`Available in ZIP ${listAnd(zips)}`);
  } else if (zips.length > 6) {
    lines.push("Available in selected ZIP codes");
  }
  for (const utility of utilities) {
    lines.push(`Available to eligible ${utility} customers`);
  }

  if (lines.length === 0) {
    lines.push("Service area needs to be confirmed");
  }

  return lines;
}
