import { normalizeString } from "@/lib/eligibility/values";
import { hasResolvedPlace, type DirectoryPlace } from "@/lib/programs/location-context";
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

const RESTRICTIVE_LOCATION_TYPES: readonly LocationType[] = [
  "ZIP",
  "CITY",
  "COUNTY",
  "ELECTRIC_UTILITY",
  "GAS_UTILITY",
];

const LOCAL_TYPES: readonly LocationType[] = ["ZIP", "CITY", "COUNTY"];

type RestrictiveStatus = "PASS" | "FAIL" | "UNKNOWN";

function knownPlaceValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function placeValueForType(place: DirectoryPlace, type: LocationType): string | undefined {
  switch (type) {
    case "ZIP":
      return knownPlaceValue(place.zip);
    case "CITY":
      // Governing municipality only. Postal place/neighborhood is not CITY.
      return knownPlaceValue(place.city);
    case "COUNTY":
      return knownPlaceValue(place.county);
    case "ELECTRIC_UTILITY":
      return knownPlaceValue(place.electricUtility);
    case "GAS_UTILITY":
      return knownPlaceValue(place.gasUtility);
    default:
      return undefined;
  }
}

function rowMatchesType(type: LocationType, placeValue: string, rowValue: string): boolean {
  if (type === "ZIP") {
    return zipEquals(rowValue, placeValue);
  }
  if (type === "COUNTY") {
    return countyMatches(rowValue, placeValue);
  }
  return textMatches(rowValue, placeValue);
}

function localReasonForType(type: LocationType): LocalMatchReason | undefined {
  if (type === "ZIP") {
    return "zip";
  }
  if (type === "CITY") {
    return "city";
  }
  if (type === "COUNTY") {
    return "county";
  }
  return undefined;
}

/**
 * Same-type rows are OR alternatives. A missing user value is UNKNOWN,
 * not a match. Different restrictive types are combined by the caller.
 */
function evaluateRestrictiveType(
  locations: ProgramLocation[],
  type: LocationType,
  place: DirectoryPlace,
): RestrictiveStatus | null {
  const rows = rowsOfType(locations, type);
  if (rows.length === 0) {
    return null;
  }

  const known = placeValueForType(place, type);
  if (!known) {
    return "UNKNOWN";
  }

  return rows.some((row) => rowMatchesType(type, known, row.location_value))
    ? "PASS"
    : "FAIL";
}

export type LocationClassification =
  | { status: "mismatch" }
  | { status: "keep"; bucket: GeographicBucket; localReason?: LocalMatchReason };

/**
 * Conservative geographic relevance for the directory.
 * Independent of the eligibility evaluator. Same-type rows are OR;
 * different restrictive types are AND. A ZIP/city/county match does
 * not override an unresolved utility (or other) restriction.
 */
export function classifyDirectoryLocation(
  program: Program,
  locations: ProgramLocation[],
  place: DirectoryPlace,
): LocationClassification {
  if (program.statewide) {
    return { status: "keep", bucket: "statewide" };
  }

  const statuses: RestrictiveStatus[] = [];
  let localReason: LocalMatchReason | undefined;

  for (const type of RESTRICTIVE_LOCATION_TYPES) {
    const status = evaluateRestrictiveType(locations, type, place);
    if (status === null) {
      continue;
    }
    if (status === "FAIL") {
      return { status: "mismatch" };
    }
    statuses.push(status);
    if (status === "PASS" && LOCAL_TYPES.includes(type) && !localReason) {
      localReason = localReasonForType(type);
    }
  }

  if (statuses.some((status) => status === "UNKNOWN")) {
    return { status: "keep", bucket: "unresolved" };
  }

  if (statuses.length > 0 && statuses.every((status) => status === "PASS") && localReason) {
    return { status: "keep", bucket: "local", localReason };
  }

  return { status: "keep", bucket: "unresolved" };
}

/**
 * Organize programs by geographic relevance. Known geographic mismatches
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

  const kept: DirectoryLocationResult[] = [];

  for (const program of programs) {
    const locations = locationsByProgram.get(program.id) ?? [];
    const classified = classifyDirectoryLocation(program, locations, place);
    if (classified.status === "mismatch") {
      continue;
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
