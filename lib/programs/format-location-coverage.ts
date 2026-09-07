import type { DirectoryPlace } from "@/lib/programs/location-context";
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

function countyKey(value: string): string {
  return value.trim().toLowerCase().replace(/ county$/, "");
}

function focusedPlaceLine(
  locations: ProgramLocation[],
  place: DirectoryPlace,
): string | null {
  if (place.county) {
    const match = locations.find(
      (row) =>
        row.location_type === "COUNTY" &&
        countyKey(row.location_value) === countyKey(place.county ?? ""),
    );
    if (match) {
      return `Available in ${formatCountyName(match.location_value)}`;
    }
  }
  if (place.city) {
    const match = locations.find(
      (row) =>
        row.location_type === "CITY" &&
        row.location_value.trim().toLowerCase() === place.city?.trim().toLowerCase(),
    );
    if (match) {
      return `Available in ${match.location_value.trim()}`;
    }
  }
  if (place.zip) {
    const digits = place.zip.replace(/\D/g, "").slice(0, 5);
    const match = locations.find((row) => {
      if (row.location_type !== "ZIP") {
        return false;
      }
      return row.location_value.replace(/\D/g, "").slice(0, 5) === digits;
    });
    if (match) {
      const zip = match.location_value.replace(/\D/g, "").slice(0, 5);
      return `Available in ZIP ${zip}`;
    }
  }
  return null;
}

export function formatLocationCoverageLines(
  statewide: boolean,
  locations: ProgramLocation[],
  options?: { focusPlace?: DirectoryPlace },
): string[] {
  if (options?.focusPlace) {
    const focused = focusedPlaceLine(locations, options.focusPlace);
    if (focused) {
      return [focused];
    }
  }

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
