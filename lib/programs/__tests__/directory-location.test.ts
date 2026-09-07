import { describe, expect, it } from "vitest";
import {
  applyDirectoryLocation,
  classifyDirectoryLocation,
  countDirectoryBuckets,
  groupDirectoryResults,
} from "@/lib/programs/directory-location";
import {
  formatDirectoryPlaceLine,
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

  it("formats a resolved city without hard-coding it", () => {
    expect(formatDirectoryPlaceLine(resolveDirectoryPlaceFromZip("94110"))).toBe(
      "94110 · San Francisco, CA",
    );
    expect(formatDirectoryPlaceLine(resolveDirectoryPlaceFromZip("90012"))).toBe(
      "90012 · Los Angeles, CA",
    );
    expect(formatDirectoryPlaceLine({ zip: "10001" })).toBe("10001");
    expect(formatDirectoryPlaceLine(resolveDirectoryPlaceFromZip("91331"))).toBe(
      "91331 · Pacoima, CA",
    );
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
  const countySf = makeProgram({ id: "county-sf", name: "SF County rebate", statewide: false });
  const countySd = makeProgram({ id: "county-sd", name: "SD County rebate", statewide: false });
  const utilityOnly = makeProgram({ id: "util-1", name: "Utility rebate", statewide: false });
  const cityLa = makeProgram({ id: "city-la", name: "LA city rebate", statewide: false });
  const cityOak = makeProgram({ id: "city-oak", name: "Oakland rebate", statewide: false });

  const zipRows = [
    makeLocation({ program_id: zipLocal.id, location_type: "ZIP", location_value: "94110" }),
    makeLocation({ program_id: zipLocal.id, location_type: "ZIP", location_value: "94111" }),
  ];
  const otherZipRows = [
    makeLocation({ program_id: otherZip.id, location_type: "ZIP", location_value: "90210" }),
  ];
  const countySfRows = [
    makeLocation({
      program_id: countySf.id,
      location_type: "COUNTY",
      location_value: "San Francisco",
    }),
  ];
  const countySdRows = [
    makeLocation({
      program_id: countySd.id,
      location_type: "COUNTY",
      location_value: "San Diego",
    }),
  ];
  const utilityRows = [
    makeLocation({
      program_id: utilityOnly.id,
      location_type: "ELECTRIC_UTILITY",
      location_value: "PG&E",
    }),
  ];
  const cityLaRows = [
    makeLocation({ program_id: cityLa.id, location_type: "CITY", location_value: "Los Angeles" }),
  ];
  const cityOakRows = [
    makeLocation({ program_id: cityOak.id, location_type: "CITY", location_value: "Oakland" }),
  ];

  const map = locationsMap([
    [statewide, statewideLocations(statewide.id)],
    [zipLocal, zipRows],
    [otherZip, otherZipRows],
    [countySf, countySfRows],
    [countySd, countySdRows],
    [utilityOnly, utilityRows],
    [cityLa, cityLaRows],
    [cityOak, cityOakRows],
  ]);

  const sfPlace = resolveDirectoryPlaceFromZip("94110");
  const oakPlace = resolveDirectoryPlaceFromZip("94612");
  const laPlace = resolveDirectoryPlaceFromZip("90012");

  it("does not filter when no place is resolved", () => {
    const result = applyDirectoryLocation([statewide, zipLocal, otherZip, countySf], map, {});
    expect(result.map((item) => item.program.id)).toEqual([
      statewide.id,
      zipLocal.id,
      otherZip.id,
      countySf.id,
    ]);
  });

  it("keeps statewide programs in the California bucket", () => {
    const result = applyDirectoryLocation([statewide, otherZip], map, sfPlace);
    expect(result.find((item) => item.program.id === statewide.id)?.bucket).toBe("statewide");
  });

  it("treats an exact ZIP row as a local match", () => {
    const result = applyDirectoryLocation([zipLocal], map, sfPlace);
    expect(result).toEqual([{ program: zipLocal, bucket: "local", localReason: "zip" }]);
  });

  it("excludes a ZIP-restricted program that lists other ZIPs only", () => {
    const result = applyDirectoryLocation([otherZip, statewide], map, sfPlace);
    expect(result.map((item) => item.program.id)).toEqual([statewide.id]);
    expect(classifyDirectoryLocation(otherZip, otherZipRows, sfPlace).status).toBe("mismatch");
  });

  it("treats a matching county as a local match", () => {
    const result = applyDirectoryLocation([countySf], map, sfPlace);
    expect(result).toEqual([{ program: countySf, bucket: "local", localReason: "county" }]);
  });

  it("treats a county row with a County suffix as a local match", () => {
    const program = makeProgram({ id: "sf-suffix", statewide: false });
    const rows = [
      makeLocation({
        program_id: program.id,
        location_type: "COUNTY",
        location_value: "San Francisco County",
      }),
    ];
    const result = applyDirectoryLocation(
      [program],
      new Map([[program.id, rows]]),
      sfPlace,
    );
    expect(result).toEqual([{ program, bucket: "local", localReason: "county" }]);
  });

  it("excludes a conflicting county", () => {
    const result = applyDirectoryLocation([countySd, statewide], map, sfPlace);
    expect(result.map((item) => item.program.id)).toEqual([statewide.id]);
    expect(classifyDirectoryLocation(countySd, countySdRows, sfPlace).status).toBe("mismatch");
  });

  it("treats a matching city as a local match", () => {
    const result = applyDirectoryLocation([cityLa], map, laPlace);
    expect(result).toEqual([{ program: cityLa, bucket: "local", localReason: "city" }]);
  });

  it("excludes a conflicting city", () => {
    const result = applyDirectoryLocation([cityOak, statewide], map, sfPlace);
    expect(result.map((item) => item.program.id)).toEqual([statewide.id]);
  });

  it("keeps utility-only programs as unresolved because provider is unknown", () => {
    const result = applyDirectoryLocation([utilityOnly], map, sfPlace);
    expect(result).toEqual([{ program: utilityOnly, bucket: "unresolved" }]);
  });

  it("does not infer utility from ZIP", () => {
    expect(sfPlace.electricUtility).toBeUndefined();
    expect(oakPlace.gasUtility).toBeUndefined();
    expect(classifyDirectoryLocation(utilityOnly, utilityRows, sfPlace)).toEqual({
      status: "keep",
      bucket: "unresolved",
    });
  });

  it("orders local matches before statewide and unresolved programs", () => {
    const result = applyDirectoryLocation(
      [statewide, countySf, zipLocal, utilityOnly],
      map,
      sfPlace,
    );
    expect(result.map((item) => item.bucket)).toEqual([
      "local",
      "local",
      "statewide",
      "unresolved",
    ]);
  });

  it("never puts a mismatch into a results bucket", () => {
    const result = applyDirectoryLocation(
      [otherZip, countySd, cityOak, statewide, zipLocal],
      map,
      sfPlace,
    );
    expect(result.map((item) => item.program.id).sort()).toEqual(
      [statewide.id, zipLocal.id].sort(),
    );
    const counts = countDirectoryBuckets(result);
    expect(counts.local).toBe(1);
    expect(counts.statewide).toBe(1);
    expect(counts.unresolved).toBe(0);
  });

  it("keeps a ZIP match even when utility coverage is also listed", () => {
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
      sfPlace,
    );
    expect(result).toEqual([{ program: mixed, bucket: "unresolved" }]);
  });

  it("treats ZIP pass + unknown electric utility as unresolved", () => {
    const mixed = makeProgram({ id: "zip-util-unknown", statewide: false });
    const rows = [
      makeLocation({ program_id: mixed.id, location_type: "ZIP", location_value: "94110" }),
      makeLocation({
        program_id: mixed.id,
        location_type: "ELECTRIC_UTILITY",
        location_value: "PG&E",
      }),
    ];
    expect(classifyDirectoryLocation(mixed, rows, sfPlace)).toEqual({
      status: "keep",
      bucket: "unresolved",
    });
  });

  it("treats county pass + unknown gas utility as unresolved", () => {
    const mixed = makeProgram({ id: "county-gas", statewide: false });
    const rows = [
      makeLocation({
        program_id: mixed.id,
        location_type: "COUNTY",
        location_value: "San Francisco",
      }),
      makeLocation({
        program_id: mixed.id,
        location_type: "GAS_UTILITY",
        location_value: "PG&E",
      }),
    ];
    expect(classifyDirectoryLocation(mixed, rows, sfPlace)).toEqual({
      status: "keep",
      bucket: "unresolved",
    });
  });

  it("treats ZIP pass + known matching utility as local", () => {
    const mixed = makeProgram({ id: "zip-util-match", statewide: false });
    const rows = [
      makeLocation({ program_id: mixed.id, location_type: "ZIP", location_value: "94110" }),
      makeLocation({
        program_id: mixed.id,
        location_type: "ELECTRIC_UTILITY",
        location_value: "PG&E",
      }),
    ];
    const place = { ...sfPlace, electricUtility: "PG&E" };
    expect(classifyDirectoryLocation(mixed, rows, place)).toEqual({
      status: "keep",
      bucket: "local",
      localReason: "zip",
    });
  });

  it("treats ZIP pass + known conflicting utility as a mismatch", () => {
    const mixed = makeProgram({ id: "zip-util-conflict", statewide: false });
    const rows = [
      makeLocation({ program_id: mixed.id, location_type: "ZIP", location_value: "94110" }),
      makeLocation({
        program_id: mixed.id,
        location_type: "ELECTRIC_UTILITY",
        location_value: "PG&E",
      }),
    ];
    const place = { ...sfPlace, electricUtility: "SCE" };
    expect(classifyDirectoryLocation(mixed, rows, place)).toEqual({ status: "mismatch" });
    expect(applyDirectoryLocation([mixed], new Map([[mixed.id, rows]]), place)).toEqual([]);
  });

  it("treats ZIP conflict + unknown utility as a mismatch", () => {
    const mixed = makeProgram({ id: "zip-conflict-util", statewide: false });
    const rows = [
      makeLocation({ program_id: mixed.id, location_type: "ZIP", location_value: "90210" }),
      makeLocation({
        program_id: mixed.id,
        location_type: "ELECTRIC_UTILITY",
        location_value: "PG&E",
      }),
    ];
    expect(classifyDirectoryLocation(mixed, rows, sfPlace)).toEqual({ status: "mismatch" });
    expect(applyDirectoryLocation([mixed], new Map([[mixed.id, rows]]), sfPlace)).toEqual([]);
  });

  it("omits empty geographic sections and keeps count in sync with cards", () => {
    const result = applyDirectoryLocation([countySf, statewide], map, sfPlace);
    const grouped = groupDirectoryResults(result);
    const counts = countDirectoryBuckets(result);
    expect(grouped.map((group) => group.kind)).toEqual(["local", "statewide"]);
    expect(grouped.find((group) => group.kind === "local")?.items).toHaveLength(counts.local);
    expect(grouped.find((group) => group.kind === "statewide")?.items).toHaveLength(
      counts.statewide,
    );
    expect(grouped.find((group) => group.kind === "unresolved")).toBeUndefined();
    expect(counts.unresolved).toBe(0);
  });
});
