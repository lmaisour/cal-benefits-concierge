/**
 * Explicit ZIP -> governing municipality when the postal place label
 * is not the incorporated city.
 *
 * This is not a county-to-city inference table. Each ZIP must be listed.
 * An override is applied only when the postal county matches the row.
 */

export type ParentMunicipality = {
  city: string;
  county: string;
};

/**
 * Verified parent cities for California postal places.
 * 91331/91333/91334 are Pacoima, a community inside the City of Los Angeles.
 */
export const PARENT_MUNICIPALITY_BY_ZIP: Readonly<
  Record<string, ParentMunicipality>
> = {
  "91331": { city: "Los Angeles", county: "Los Angeles" },
  "91333": { city: "Los Angeles", county: "Los Angeles" },
  "91334": { city: "Los Angeles", county: "Los Angeles" },
};

function countyKey(value: string): string {
  return value.trim().toLowerCase().replace(/ county$/, "");
}

/**
 * Return the governing city only when this ZIP has an explicit row and
 * the postal county agrees. County membership alone never produces a city.
 */
export function lookupParentMunicipality(
  zip: string,
  postal: { city: string; county: string },
): ParentMunicipality | null {
  const row = PARENT_MUNICIPALITY_BY_ZIP[zip];
  if (!row) {
    return null;
  }
  if (countyKey(row.county) !== countyKey(postal.county)) {
    return null;
  }
  return row;
}
