import { evaluateGeography } from "@/lib/eligibility/evaluate-geography";
import { normalizeString } from "@/lib/eligibility/values";
import {
  directoryPlaceToProfile,
  hasResolvedPlace,
  type DirectoryPlace,
} from "@/lib/programs/location-context";
import type { LocationType, Program, ProgramLocation } from "@/types/program";

/**
 * Best geographic match we can prove from structured program_locations.
 * Lower rank is shown first when a place filter is active.
 */
export const LOCATION_MATCH_RANK = {
  zip: 1,
  city: 2,
  county: 3,
  utility: 4,
  statewide: 5,
  unresolved: 6,
} as const;

export type LocationMatchKind = keyof typeof LOCATION_MATCH_RANK;

export type DirectoryLocationResult = {
  program: Program;
  match: LocationMatchKind;
};

function digitsZip(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 5 || digits.length === 9) {
    return digits.slice(0, 5);
  }
  return null;
}

function rowsOfType(
  locations: ProgramLocation[],
  type: LocationType,
): ProgramLocation[] {
  return locations.filter((location) => location.location_type === type);
}

function textMatches(left: string, right: string): boolean {
  return normalizeString(left) === normalizeString(right);
}

function hasExactZipMatch(locations: ProgramLocation[], zip: string): boolean {
  const wanted = digitsZip(zip);
  if (!wanted) {
    return false;
  }
  return rowsOfType(locations, "ZIP").some((row) => digitsZip(row.location_value) === wanted);
}

function hasTextTypeMatch(
  locations: ProgramLocation[],
  type: LocationType,
  value: string | undefined,
): boolean {
  if (!value) {
    return false;
  }
  return rowsOfType(locations, type).some((row) => textMatches(row.location_value, value));
}

export function classifyDirectoryLocation(
  program: Program,
  locations: ProgramLocation[],
  place: DirectoryPlace,
): LocationMatchKind {
  if (place.zip && hasExactZipMatch(locations, place.zip)) {
    return "zip";
  }
  if (hasTextTypeMatch(locations, "CITY", place.city)) {
    return "city";
  }
  if (hasTextTypeMatch(locations, "COUNTY", place.county)) {
    return "county";
  }
  if (
    hasTextTypeMatch(locations, "ELECTRIC_UTILITY", place.electricUtility) ||
    hasTextTypeMatch(locations, "GAS_UTILITY", place.gasUtility)
  ) {
    return "utility";
  }
  if (program.statewide) {
    return "statewide";
  }
  return "unresolved";
}

/**
 * Keep programs unless structured location data proves they do not apply.
 * UNKNOWN geography (city/county/utility listed, but not resolvable from ZIP)
 * is included, not dropped.
 */
export function applyDirectoryLocation(
  programs: Program[],
  locationsByProgram: Map<string, ProgramLocation[]>,
  place: DirectoryPlace,
): DirectoryLocationResult[] {
  if (!hasResolvedPlace(place)) {
    return programs.map((program) => ({ program, match: "unresolved" }));
  }

  const profile = directoryPlaceToProfile(place);
  const kept: DirectoryLocationResult[] = [];

  for (const program of programs) {
    const locations = locationsByProgram.get(program.id) ?? [];
    const geography = evaluateGeography(program, locations, profile);
    if (geography.status === "FAIL") {
      continue;
    }
    kept.push({
      program,
      match: classifyDirectoryLocation(program, locations, place),
    });
  }

  return kept.sort((a, b) => {
    const rankDelta = LOCATION_MATCH_RANK[a.match] - LOCATION_MATCH_RANK[b.match];
    if (rankDelta !== 0) {
      return rankDelta;
    }
    return 0;
  });
}

export const LOCATION_SECTION_COPY: Record<
  LocationMatchKind,
  { title: string; description: string }
> = {
  zip: {
    title: "In this ZIP code",
    description: "These programs list your ZIP code in their published service area.",
  },
  city: {
    title: "City programs",
    description: "These programs list a city that matches the location we have for you.",
  },
  county: {
    title: "County programs",
    description: "These programs list a county that matches the location we have for you.",
  },
  utility: {
    title: "Utility or provider programs",
    description:
      "These programs list an electric or gas provider that matches the location we have for you.",
  },
  statewide: {
    title: "California statewide programs",
    description: "These programs are offered across California, not only in one city or ZIP.",
  },
  unresolved: {
    title: "Other programs that may still apply",
    description:
      "These programs list city, county, or utility coverage. A ZIP code alone is not enough to confirm them, so they stay in the list until we can match that detail.",
  },
};

export const LOCATION_MATCH_LABEL: Partial<Record<LocationMatchKind, string>> = {
  zip: "In your ZIP",
  city: "City match",
  county: "County match",
  utility: "Provider match",
};

const SECTION_ORDER: LocationMatchKind[] = [
  "zip",
  "city",
  "county",
  "utility",
  "statewide",
  "unresolved",
];

export function groupDirectoryResults(
  results: DirectoryLocationResult[],
): Array<{ kind: LocationMatchKind; items: DirectoryLocationResult[] }> {
  return SECTION_ORDER.flatMap((kind) => {
    const items = results.filter((item) => item.match === kind);
    return items.length > 0 ? [{ kind, items }] : [];
  });
}
