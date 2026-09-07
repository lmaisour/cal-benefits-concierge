import { evaluateGeography } from "@/lib/eligibility/evaluate-geography";
import { normalizeString } from "@/lib/eligibility/values";
import {
  directoryPlaceToProfile,
  hasResolvedPlace,
  type DirectoryPlace,
} from "@/lib/programs/location-context";
import type { LocationType, Program, ProgramLocation } from "@/types/program";

export type GeographicBucket = "local" | "statewide" | "unresolved";

export type LocalMatchReason = "zip" | "city" | "county";

export type DirectoryLocationResult = {
  program: Program;
  bucket: GeographicBucket;
  localReason?: LocalMatchReason;
};

/** Card badge typing. */
export type LocationMatchKind = GeographicBucket | LocalMatchReason;

const BUCKET_RANK: Record<GeographicBucket, number> = {
  local: 1,
  statewide: 2,
  unresolved: 3,
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

function countyMatches(locationValue: string, county: string): boolean {
  const left = normalizeString(locationValue).replace(/ county$/, "");
  const right = normalizeString(county).replace(/ county$/, "");
  return left === right;
}

function zipEquals(locationValue: string, zip: string): boolean {
  const left = digitsZip(locationValue);
  const right = digitsZip(zip);
  return Boolean(left && right && left === right);
}

function hasExactZipMatch(locations: ProgramLocation[], zip: string): boolean {
  return rowsOfType(locations, "ZIP").some((row) => zipEquals(row.location_value, zip));
}

function hasCityMatch(locations: ProgramLocation[], city: string): boolean {
  return rowsOfType(locations, "CITY").some((row) => textMatches(row.location_value, city));
}

function hasCountyMatch(locations: ProgramLocation[], county: string): boolean {
  return rowsOfType(locations, "COUNTY").some((row) => countyMatches(row.location_value, county));
}

function hasTypeConflict(
  locations: ProgramLocation[],
  type: LocationType,
  known: string | undefined,
  matches: (rowValue: string, known: string) => boolean,
): boolean {
  if (!known) {
    return false;
  }
  const rows = rowsOfType(locations, type);
  if (rows.length === 0) {
    return false;
  }
  return !rows.some((row) => matches(row.location_value, known));
}

export type LocationClassification =
  | { status: "mismatch" }
  | { status: "keep"; bucket: GeographicBucket; localReason?: LocalMatchReason };

/**
 * Conservative geographic relevance for the directory.
 * Does not change the eligibility engine.
 */
export function classifyDirectoryLocation(
  program: Program,
  locations: ProgramLocation[],
  place: DirectoryPlace,
): LocationClassification {
  if (program.statewide) {
    return { status: "keep", bucket: "statewide" };
  }

  if (hasTypeConflict(locations, "ZIP", place.zip, zipEquals)) {
    return { status: "mismatch" };
  }
  if (hasTypeConflict(locations, "CITY", place.city, textMatches)) {
    return { status: "mismatch" };
  }
  if (hasTypeConflict(locations, "COUNTY", place.county, countyMatches)) {
    return { status: "mismatch" };
  }

  if (place.zip && hasExactZipMatch(locations, place.zip)) {
    return { status: "keep", bucket: "local", localReason: "zip" };
  }
  if (place.city && hasCityMatch(locations, place.city)) {
    return { status: "keep", bucket: "local", localReason: "city" };
  }
  if (place.county && hasCountyMatch(locations, place.county)) {
    return { status: "keep", bucket: "local", localReason: "county" };
  }

  return { status: "keep", bucket: "unresolved" };
}

/**
 * Organize programs by geographic relevance. Known ZIP/city/county mismatches
 * are omitted. Statewide and unresolved restricted programs stay visible.
 */
export function applyDirectoryLocation(
  programs: Program[],
  locationsByProgram: Map<string, ProgramLocation[]>,
  place: DirectoryPlace,
): DirectoryLocationResult[] {
  if (!hasResolvedPlace(place)) {
    return programs.map((program) => ({ program, bucket: "unresolved" }));
  }

  const profile = directoryPlaceToProfile(place);
  const kept: DirectoryLocationResult[] = [];

  for (const program of programs) {
    const locations = locationsByProgram.get(program.id) ?? [];
    const classified = classifyDirectoryLocation(program, locations, place);
    if (classified.status === "mismatch") {
      continue;
    }

    if (!program.statewide) {
      const geography = evaluateGeography(program, locations, profile);
      if (geography.status === "FAIL") {
        continue;
      }
    }

    kept.push({
      program,
      bucket: classified.bucket,
      localReason: classified.localReason,
    });
  }

  return kept.sort((a, b) => BUCKET_RANK[a.bucket] - BUCKET_RANK[b.bucket]);
}

export const LOCATION_SECTION_COPY: Record<
  GeographicBucket,
  { title: string; description: string }
> = {
  local: {
    title: "Programs in your area",
    description: "Programs specifically matched to your ZIP, city, or county.",
  },
  statewide: {
    title: "California programs",
    description: "Statewide programs you may also qualify for.",
  },
  unresolved: {
    title: "Programs that may also be available",
    description:
      "We need more information, such as your utility provider or service area, to determine whether these programs are available to you.",
  },
};

export const LOCATION_MATCH_LABEL: Partial<Record<LocationMatchKind, string>> = {
  local: "In your area",
  zip: "In your area",
  city: "In your area",
  county: "In your area",
};

const SECTION_ORDER: GeographicBucket[] = ["local", "statewide", "unresolved"];

export function groupDirectoryResults(
  results: DirectoryLocationResult[],
): Array<{ kind: GeographicBucket; items: DirectoryLocationResult[] }> {
  return SECTION_ORDER.flatMap((kind) => {
    const items = results.filter((item) => item.bucket === kind);
    return items.length > 0 ? [{ kind, items }] : [];
  });
}

export function countDirectoryBuckets(results: DirectoryLocationResult[]): {
  local: number;
  statewide: number;
  unresolved: number;
} {
  return {
    local: results.filter((item) => item.bucket === "local").length,
    statewide: results.filter((item) => item.bucket === "statewide").length,
    unresolved: results.filter((item) => item.bucket === "unresolved").length,
  };
}
