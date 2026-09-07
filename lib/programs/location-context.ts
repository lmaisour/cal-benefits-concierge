import { isValidZip } from "@/lib/questionnaire/validation";
import type { UserProfile } from "@/lib/eligibility/types";
import { resolveZipContext } from "@/lib/geo/resolve-zip-context";

/**
 * Consumer place used for directory discovery.
 *
 * This module fills `zip` from the programs page and resolves city/county
 * from a static California ZIP map. Later resolvers can attach:
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
  city?: string;
  county?: string;
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
 * ZIP -> city and ZIP -> county are filled by `resolveZipContext`.
 * Do not infer utility, CCA, water, air, or special districts here.
 */
export function resolveDirectoryPlaceFromZip(zip: string): DirectoryPlace {
  const resolved = resolveZipContext(zip);
  return {
    zip: resolved.zip,
    city: resolved.city,
    county: resolved.county,
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

/** Consumer line for a resolved ZIP, e.g. "94110 · San Francisco, CA". */
export function formatDirectoryPlaceLine(place: DirectoryPlace): string {
  if (place.zip && place.city) {
    return `${place.zip} · ${place.city}, CA`;
  }
  if (place.zip) {
    return place.zip;
  }
  return "";
}

export function hasResolvedPlace(place: DirectoryPlace): boolean {
  return Boolean(
    place.zip ||
      place.city ||
      place.county ||
      place.electricUtility ||
      place.gasUtility ||
      place.cca ||
      place.waterDistrict ||
      place.airDistrict ||
      (place.specialDistricts && place.specialDistricts.length > 0),
  );
}
