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
 * Design (intentionally conservative to avoid false-positive matches):
 * 1. `program.statewide === true` → PASS immediately, unless a STATE row
 *    is clearly not California (`CA` / `California` / `Calif.`).
 * 2. STATE California rows are documentary only. They do not satisfy a
 *    ZIP-, city-, county-, or utility-restricted program by themselves.
 * 3. Restrictive types: COUNTY, CITY, ZIP, ELECTRIC_UTILITY, GAS_UTILITY.
 * 4. Rows of the same restrictive type are OR alternatives
 *    (any matching ZIP / county / city / utility PASSes that type).
 * 5. Different restrictive types are AND'd. ZIP + utility both listed
 *    means the user must satisfy both categories.
 * 6. Within a type: any matching row → PASS; known value with no match →
 *    FAIL; missing profile value → UNKNOWN. Utility is not inferred from ZIP.
 * 7. Across types: any FAIL → FAIL; else any UNKNOWN → UNKNOWN; else PASS.
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
  if (statuses.some((status) => status === "FAIL")) {
    return "FAIL";
  }
  if (statuses.some((status) => status === "UNKNOWN")) {
    return "UNKNOWN";
  }
  return "PASS";
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
