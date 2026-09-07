/**
 * California ZIP -> place / governing city / county lookup.
 *
 * Source: GeoNames US postal codes (https://download.geonames.org/export/zip/US.zip),
 * filtered to admin1=CA. County names are normalized to match catalog values
 * (e.g. "City and County of San Francisco" -> "San Francisco").
 *
 * GeoNames `city` is the postal place label. When that label is a
 * neighborhood or community, `data/geo/parent-municipalities.ts` can supply
 * the incorporated city. This module does not infer electric/gas utility,
 * CCA, water, air, or special districts.
 */

import caZipPlaces from "@/data/geo/ca-zip-places.json";
import { lookupParentMunicipality } from "@/data/geo/parent-municipalities";

export type ZipPlace = {
  city: string;
  county: string;
};

export type ZipContext = {
  zip: string;
  place?: string;
  city?: string;
  county?: string;
  state?: string;
};

const PLACES = caZipPlaces as Record<string, ZipPlace>;

export function lookupCaliforniaZip(zip: string): ZipPlace | null {
  return PLACES[zip] ?? null;
}

/**
 * Server-side ZIP context for directory discovery.
 * Unknown or non-California ZIPs still return `{ zip }` so statewide
 * programs can appear; place/city/county stay unset until a later resolver.
 */
export function resolveZipContext(zip: string): ZipContext {
  const postal = lookupCaliforniaZip(zip);
  if (!postal) {
    return { zip };
  }

  const parent = lookupParentMunicipality(zip, postal);
  return {
    zip,
    place: postal.city,
    city: parent?.city ?? postal.city,
    county: postal.county,
    state: "CA",
  };
}
