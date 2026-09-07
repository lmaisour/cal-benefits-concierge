/**
 * California ZIP -> city/county lookup.
 *
 * Source: GeoNames US postal codes (https://download.geonames.org/export/zip/US.zip),
 * filtered to admin1=CA. County names are normalized to match catalog values
 * (e.g. "City and County of San Francisco" -> "San Francisco").
 *
 * This module only resolves ZIP -> city and ZIP -> county.
 * Do not infer electric/gas utility, CCA, water, air, or special districts here.
 */

import caZipPlaces from "@/data/geo/ca-zip-places.json";

export type ZipPlace = {
  city: string;
  county: string;
};

export type ZipContext = {
  zip: string;
  city?: string;
  county?: string;
};

const PLACES = caZipPlaces as Record<string, ZipPlace>;

export function lookupCaliforniaZip(zip: string): ZipPlace | null {
  return PLACES[zip] ?? null;
}

/**
 * Server-side ZIP context for directory discovery.
 * Unknown or non-California ZIPs still return `{ zip }` so statewide
 * programs can appear; city/county stay unset until a later resolver.
 */
export function resolveZipContext(zip: string): ZipContext {
  const place = lookupCaliforniaZip(zip);
  if (!place) {
    return { zip };
  }
  return { zip, city: place.city, county: place.county };
}
