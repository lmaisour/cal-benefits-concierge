import { explainGeography } from "@/lib/eligibility/explanations";
import type { GeographyEvaluation, UserProfile } from "@/lib/eligibility/types";
import {
  isMissing,
  normalizeString,
  valuesEqual,
} from "@/lib/eligibility/values";
import type { LocationType, Program, ProgramLocation } from "@/types/program";

const RESTRICTIVE_LOCATION_TYPES: readonly LocationType[] = [
  "COUNTY",
  "CITY",
  "ZIP",
  "ELECTRIC_UTILITY",
  "GAS_UTILITY",
];

const CALIFORNIA_ALIASES = new Set(["ca", "california", "calif."]);

/**
 * Deterministic MVP location matching. No GIS and no external APIs.
 *
 * Design:
 * 1. `program.statewide === true` → PASS. This product is California-only.
 * 2. STATE rows are documentary for CA (`CA` / `California` / `Calif.`).
 *    A non-California STATE row → FAIL. STATE CA is not treated as an
 *    alternative that would make every resident match a ZIP-limited program.
 * 3. Rows of the same restrictive type are OR alternatives
 *    (any matching ZIP / county / city / utility PASSes that type).
 * 4. Different restrictive types are also OR'd. Seed programs list ZIP, city,
 *    and county as alternate ways to identify a service area. AND-ing them
 *    would mark a matching ZIP as UNKNOWN just because city was blank.
 * 5. A restrictive type with a known profile value that matches none of the
 *    listed rows is a conflict (FAIL for that type).
 * 6. A restrictive type whose profile value is missing is UNKNOWN for that type.
 *    We do not infer utility from ZIP (or county from city).
 * 7. Across types: any PASS → PASS; else any UNKNOWN → UNKNOWN; else FAIL.
 * 8. No restrictive types (statewide-equivalent, or only STATE CA) → PASS.
 */
export function evaluateGeography(
  program: Program,
  locations: ProgramLocation[],
  profile: UserProfile,
): GeographyEvaluation {
  const programLocations = locations.filter(
    (location) => location.program_id === program.id,
  );

  const nonCaliforniaState = programLocations.find(
    (location) =>
      location.location_type === "STATE" &&
      !CALIFORNIA_ALIASES.has(normalizeString(location.location_value)),
  );
  if (nonCaliforniaState) {
    return finish({
      status: "FAIL",
      matchedLocations: [],
      conflictingTypes: ["STATE"],
      unknownTypes: [],
    });
  }

  if (program.statewide) {
    return finish({
      status: "PASS",
      matchedLocations: programLocations.filter(
        (location) => location.location_type === "STATE",
      ),
      conflictingTypes: [],
      unknownTypes: [],
    });
  }

  const restrictive = programLocations.filter((location) =>
    RESTRICTIVE_LOCATION_TYPES.includes(location.location_type),
  );

  if (restrictive.length === 0) {
    return finish({
      status: "PASS",
      matchedLocations: programLocations.filter(
        (location) => location.location_type === "STATE",
      ),
      conflictingTypes: [],
      unknownTypes: [],
    });
  }

  const byType = new Map<LocationType, ProgramLocation[]>();
  for (const location of restrictive) {
    const existing = byType.get(location.location_type) ?? [];
    existing.push(location);
    byType.set(location.location_type, existing);
  }

  const matchedLocations: ProgramLocation[] = [];
  const conflictingTypes: LocationType[] = [];
  const unknownTypes: LocationType[] = [];
  const typeStatuses: Array<"PASS" | "FAIL" | "UNKNOWN"> = [];

  for (const [type, rows] of byType) {
    const profileValue = profileValueForType(profile, type);
    if (isMissing(profileValue)) {
      unknownTypes.push(type);
      typeStatuses.push("UNKNOWN");
      continue;
    }

    const matches = rows.filter((row) =>
      locationMatches(type, profileValue, row.location_value),
    );
    if (matches.length > 0) {
      matchedLocations.push(...matches);
      typeStatuses.push("PASS");
    } else {
      conflictingTypes.push(type);
      typeStatuses.push("FAIL");
    }
  }

  const status = combineTypeStatuses(typeStatuses);
  return finish({
    status,
    matchedLocations,
    conflictingTypes,
    unknownTypes,
  });
}

function combineTypeStatuses(
  statuses: Array<"PASS" | "FAIL" | "UNKNOWN">,
): "PASS" | "FAIL" | "UNKNOWN" {
  if (statuses.some((status) => status === "PASS")) {
    return "PASS";
  }
  if (statuses.some((status) => status === "UNKNOWN")) {
    return "UNKNOWN";
  }
  return "FAIL";
}

function profileValueForType(
  profile: UserProfile,
  type: LocationType,
): unknown {
  switch (type) {
    case "ZIP":
      return profile.zip;
    case "CITY":
      return profile.city;
    case "COUNTY":
      return profile.county;
    case "ELECTRIC_UTILITY":
      return profile.electric_utility;
    case "GAS_UTILITY":
      return profile.gas_utility;
    default:
      return undefined;
  }
}

function locationMatches(
  type: LocationType,
  profileValue: unknown,
  locationValue: string,
): boolean {
  if (type === "ZIP" && typeof profileValue === "string") {
    return normalizeString(profileValue) === normalizeString(locationValue);
  }
  return valuesEqual(profileValue, locationValue) === true;
}

function finish(
  evaluation: Omit<GeographyEvaluation, "explanation">,
): GeographyEvaluation {
  return {
    ...evaluation,
    explanation: explainGeography(evaluation),
  };
}
