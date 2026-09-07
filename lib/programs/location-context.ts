import { isValidZip } from "@/lib/questionnaire/validation";
import type { UserProfile } from "@/lib/eligibility/types";

/**
 * Consumer place used for directory discovery.
 *
 * This milestone only fills `zip` from the programs page. Later resolvers
 * can attach city, county, utilities, and districts without changing the
 * ranking API:
 *   ZIP -> city
 *   ZIP -> county
 *   address -> electric utility
 *   address -> gas utility
 *   address -> CCA
 *   address -> water district
 *   address -> air district
 *   address -> special districts
 *
 * Do not infer those fields here.
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
 */
export function resolveDirectoryPlaceFromZip(zip: string): DirectoryPlace {
  return { zip };
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
