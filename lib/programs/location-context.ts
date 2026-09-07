import { isValidZip } from "@/lib/questionnaire/validation";
import type { UserProfile } from "@/lib/eligibility/types";
import { resolveZipContext } from "@/lib/geo/resolve-zip-context";

/**
 * Consumer place used for directory discovery.
 *
 * This module fills `zip` from the programs page and resolves
 * place / governing city / county from a static California ZIP map.
 * Later resolvers can attach:
 *   address -> electric utility
 *   address -> gas utility
 *   address -> CCA
 *   address -> water district
 *   address -> air district
 *   address -> special districts
 *
 * Do not infer utility or district fields here.
 */
export type DirectoryPlace = {
  zip?: string;
  place?: string;
  city?: string;
  county?: string;
  state?: string;
  electricUtility?: string;
  gasUtility?: string;
  cca?: string;
  waterDistrict?: string;
  airDistrict?: string;
  specialDistricts?: string[];
};

export type ParsedDirectoryZip =
  | { status: "empty"; zip: null; error: null }
  | { status: "invalid"; zip: null; error: string }
  | { status: "valid"; zip: string; error: null };

export function parseDirectoryZip(raw: string | undefined): ParsedDirectoryZip {
  const trimmed = raw?.trim() ?? "";
  if (trimmed === "") {
    return { status: "empty", zip: null, error: null };
  }
  if (!isValidZip(trimmed)) {
    return {
      status: "invalid",
      zip: null,
      error: "Enter a 5-digit U.S. ZIP code.",
    };
  }
  return { status: "valid", zip: trimmed, error: null };
}

/**
 * ZIP-only resolver. Future jurisdiction resolution belongs here, not in the UI.
 * ZIP -> place, governing city, and county are filled by `resolveZipContext`.
 * CITY program matching uses `city` (municipality), not `place`.
 * Do not infer utility, CCA, water, air, or special districts here.
 */
export function resolveDirectoryPlaceFromZip(zip: string): DirectoryPlace {
  const resolved = resolveZipContext(zip);
  return {
    zip: resolved.zip,
    place: resolved.place,
    city: resolved.city,
    county: resolved.county,
    state: resolved.state,
  };
}

export function directoryPlaceToProfile(place: DirectoryPlace): UserProfile {
  return {
    zip: place.zip,
    city: place.city,
    county: place.county,
    electric_utility: place.electricUtility,
    gas_utility: place.gasUtility,
  };
}

/**
 * Consumer line for a resolved ZIP.
 * Prefer the postal place label so 91331 still reads as Pacoima.
 */
export function formatDirectoryPlaceLine(place: DirectoryPlace): string {
  const locality = place.place || place.city;
  if (place.zip && locality) {
    return `${place.zip} · ${locality}, CA`;
  }
  if (place.zip) {
    return place.zip;
  }
  return "";
}

export function hasResolvedPlace(place: DirectoryPlace): boolean {
  return Boolean(
    place.zip ||
      place.place ||
      place.city ||
      place.county ||
      place.state ||
      place.electricUtility ||
      place.gasUtility ||
      place.cca ||
      place.waterDistrict ||
      place.airDistrict ||
      (place.specialDistricts && place.specialDistricts.length > 0),
  );
}
