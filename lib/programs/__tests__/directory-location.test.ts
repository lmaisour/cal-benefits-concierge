import { describe, expect, it } from "vitest";
import {
  applyDirectoryLocation,
  classifyDirectoryLocation,
  LOCATION_MATCH_RANK,
} from "@/lib/programs/directory-location";
import {
  parseDirectoryZip,
  resolveDirectoryPlaceFromZip,
} from "@/lib/programs/location-context";
import {
  makeLocation,
  makeProgram,
  statewideLocations,
} from "@/lib/eligibility/__tests__/fixtures";
import type { Program, ProgramLocation } from "@/types/program";

function locationsMap(
  entries: Array<[Program, ProgramLocation[]]>,
): Map<string, ProgramLocation[]> {
  return new Map(entries.map(([program, locations]) => [program.id, locations]));
}

describe("parseDirectoryZip", () => {
  it("treats a blank value as inactive", () => {
    expect(parseDirectoryZip(undefined).status).toBe("empty");
    expect(parseDirectoryZip("  ").status).toBe("empty");
  });

  it("accepts a 5-digit ZIP", () => {
    expect(parseDirectoryZip("94110")).toEqual({
      status: "valid",
      zip: "94110",
      error: null,
    });
  });

  it("rejects invalid ZIP input without inventing a place", () => {
    const parsed = parseDirectoryZip("9411");
    expect(parsed.status).toBe("invalid");
    expect(parsed.zip).toBeNull();
  });
});

describe("applyDirectoryLocation", () => {
  const statewide = makeProgram({ id: "state-1", name: "Statewide rebate", statewide: true });
  const zipLocal = makeProgram({ id: "zip-1", name: "ZIP rebate", statewide: false });
  const otherZip = makeProgram({ id: "zip-2", name: "Other ZIP rebate", statewide: false });
  const countyOnly = makeProgram({ id: "county-1", name: "County rebate", statewide: false });
  const utilityOnly = makeProgram({ id: "util-1", name: "Utility rebate", statewide: false });
  const cityOnly = makeProgram({ id: "city-1", name: "City rebate", statewide: false });

  const zipRows = [
    makeLocation({ program_id: zipLocal.id, location_type: "ZIP", location_value: "94110" }),
    makeLocation({ program_id: zipLocal.id, location_type: "ZIP", location_value: "94111" }),
  ];
  const otherZipRows = [
    makeLocation({ program_id: otherZip.id, location_type: "ZIP", location_value: "90210" }),
  ];
  const countyRows = [
    makeLocation({
      program_id: countyOnly.id,
      location_type: "COUNTY",
      location_value: "San Francisco",
    }),
  ];
  const utilityRows = [
    makeLocation({
      program_id: utilityOnly.id,
      location_type: "ELECTRIC_UTILITY",
      location_value: "PG&E",
    }),
  ];
  const cityRows = [
    makeLocation({ program_id: cityOnly.id, location_type: "CITY", location_value: "Oakland" }),
  ];

  const map = locationsMap([
    [statewide, statewideLocations(statewide.id)],
    [zipLocal, zipRows],
    [otherZip, otherZipRows],
    [countyOnly, countyRows],
    [utilityOnly, utilityRows],
    [cityOnly, cityRows],
  ]);

  it("does not filter when no place is resolved", () => {
    const result = applyDirectoryLocation(
      [statewide, zipLocal, otherZip, countyOnly],
      map,
      {},
    );
    expect(result.map((item) => item.program.id)).toEqual([
      statewide.id,
      zipLocal.id,
      otherZip.id,
      countyOnly.id,
    ]);
  });

  it("keeps statewide programs for any ZIP", () => {
    const result = applyDirectoryLocation(
      [statewide, otherZip],
      map,
      resolveDirectoryPlaceFromZip("94110"),
    );
    expect(result.map((item) => item.program.id)).toContain(statewide.id);
    expect(result.find((item) => item.program.id === statewide.id)?.match).toBe("statewide");
  });

  it("treats an exact ZIP row as a local match", () => {
    const result = applyDirectoryLocation(
      [zipLocal],
      map,
      resolveDirectoryPlaceFromZip("94110"),
    );
    expect(result).toEqual([{ program: zipLocal, match: "zip" }]);
  });

  it("excludes a ZIP-restricted program that lists other ZIPs only", () => {
    const result = applyDirectoryLocation(
      [otherZip, statewide],
      map,
      resolveDirectoryPlaceFromZip("94110"),
    );
    expect(result.map((item) => item.program.id)).toEqual([statewide.id]);
  });

  it("does not exclude county-only programs from ZIP alone", () => {
    const result = applyDirectoryLocation(
      [countyOnly],
      map,
      resolveDirectoryPlaceFromZip("94110"),
    );
    expect(result).toEqual([{ program: countyOnly, match: "unresolved" }]);
  });

  it("does not exclude utility-only programs from ZIP alone", () => {
    const result = applyDirectoryLocation(
      [utilityOnly],
      map,
      resolveDirectoryPlaceFromZip("94110"),
    );
    expect(result).toEqual([{ program: utilityOnly, match: "unresolved" }]);
  });

  it("does not infer city or county from ZIP", () => {
    expect(
      classifyDirectoryLocation(cityOnly, cityRows, resolveDirectoryPlaceFromZip("94612")),
    ).toBe("unresolved");
    expect(
      classifyDirectoryLocation(countyOnly, countyRows, resolveDirectoryPlaceFromZip("94110")),
    ).toBe("unresolved");
  });

  it("ranks local ZIP matches before statewide and unresolved programs", () => {
    const result = applyDirectoryLocation(
      [statewide, countyOnly, zipLocal, utilityOnly],
      map,
      resolveDirectoryPlaceFromZip("94110"),
    );
    expect(result.map((item) => item.match)).toEqual([
      "zip",
      "statewide",
      "unresolved",
      "unresolved",
    ]);
    expect(LOCATION_MATCH_RANK.zip).toBeLessThan(LOCATION_MATCH_RANK.statewide);
    expect(LOCATION_MATCH_RANK.statewide).toBeLessThan(LOCATION_MATCH_RANK.unresolved);
  });

  it("uses city, county, and utility ranks only when those values are already known", () => {
    const ranked = applyDirectoryLocation(
      [statewide, cityOnly, countyOnly, utilityOnly, zipLocal],
      map,
      {
        zip: "94110",
        city: "Oakland",
        county: "San Francisco",
        electricUtility: "PG&E",
      },
    );
    expect(ranked.map((item) => item.match)).toEqual([
      "zip",
      "city",
      "county",
      "utility",
      "statewide",
    ]);
  });

  it("does not exclude a ZIP match when utility coverage is listed but unknown", () => {
    const mixed = makeProgram({ id: "zip-util", statewide: false });
    const rows = [
      makeLocation({ program_id: mixed.id, location_type: "ZIP", location_value: "94110" }),
      makeLocation({
        program_id: mixed.id,
        location_type: "ELECTRIC_UTILITY",
        location_value: "PG&E",
      }),
    ];
    const result = applyDirectoryLocation(
      [mixed],
      new Map([[mixed.id, rows]]),
      resolveDirectoryPlaceFromZip("94110"),
    );
    expect(result).toEqual([{ program: mixed, match: "zip" }]);
  });
});
