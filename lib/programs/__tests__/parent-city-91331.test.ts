import { describe, expect, it } from "vitest";
import { programCatalog } from "@/data/programs/index";
import {
  applyDirectoryLocation,
  classifyDirectoryLocation,
} from "@/lib/programs/directory-location";
import { resolveDirectoryPlaceFromZip } from "@/lib/programs/location-context";
import { consumerVisiblePrograms } from "@/lib/programs/import/catalog-to-engine";
import {
  makeLocation,
  makeProgram,
} from "@/lib/eligibility/__tests__/fixtures";

describe("parent-city geography for 91331", () => {
  const place = resolveDirectoryPlaceFromZip("91331");

  it("keeps postal place Pacoima and governing city Los Angeles", () => {
    expect(place).toEqual({
      zip: "91331",
      place: "Pacoima",
      city: "Los Angeles",
      county: "Los Angeles",
      state: "CA",
    });
    expect(place.electricUtility).toBeUndefined();
    expect(place.gasUtility).toBeUndefined();
    expect(place.waterDistrict).toBeUndefined();
    expect(place.airDistrict).toBeUndefined();
  });

  it("makes CITY=Los Angeles local for 91331", () => {
    const program = makeProgram({ id: "city-la", statewide: false });
    const rows = [
      makeLocation({
        program_id: program.id,
        location_type: "CITY",
        location_value: "Los Angeles",
      }),
    ];
    expect(classifyDirectoryLocation(program, rows, place)).toEqual({
      status: "keep",
      bucket: "local",
      localReason: "city",
    });
  });

  it("does not treat CITY=Pacoima as a municipality match", () => {
    const program = makeProgram({ id: "city-pacoima", statewide: false });
    const rows = [
      makeLocation({
        program_id: program.id,
        location_type: "CITY",
        location_value: "Pacoima",
      }),
    ];
    expect(classifyDirectoryLocation(program, rows, place)).toEqual({
      status: "mismatch",
    });
    expect(place.place).toBe("Pacoima");
    expect(place.city).not.toBe("Pacoima");
  });

  it("still matches COUNTY=Los Angeles", () => {
    const program = makeProgram({ id: "county-la", statewide: false });
    const rows = [
      makeLocation({
        program_id: program.id,
        location_type: "COUNTY",
        location_value: "Los Angeles",
      }),
    ];
    expect(classifyDirectoryLocation(program, rows, place)).toEqual({
      status: "keep",
      bucket: "local",
      localReason: "county",
    });
  });

  it("still excludes unrelated cities", () => {
    const program = makeProgram({ id: "city-oak", statewide: false });
    const rows = [
      makeLocation({
        program_id: program.id,
        location_type: "CITY",
        location_value: "Oakland",
      }),
    ];
    expect(classifyDirectoryLocation(program, rows, place)).toEqual({
      status: "mismatch",
    });
  });

  it("keeps unknown municipality conservative", () => {
    const program = makeProgram({ id: "city-la-unknown", statewide: false });
    const rows = [
      makeLocation({
        program_id: program.id,
        location_type: "CITY",
        location_value: "Los Angeles",
      }),
    ];
    expect(
      classifyDirectoryLocation(program, rows, { zip: "10001" }),
    ).toEqual({
      status: "keep",
      bucket: "unresolved",
    });
  });

  it("does not turn county membership into a city match", () => {
    const santaMonica = resolveDirectoryPlaceFromZip("90401");
    expect(santaMonica.county).toBe("Los Angeles");
    expect(santaMonica.city).toBe("Santa Monica");
    const program = makeProgram({ id: "city-la-sm", statewide: false });
    const rows = [
      makeLocation({
        program_id: program.id,
        location_type: "CITY",
        location_value: "Los Angeles",
      }),
    ];
    expect(classifyDirectoryLocation(program, rows, santaMonica)).toEqual({
      status: "mismatch",
    });
  });

  it("keeps AND semantics when city matches but utility is unknown", () => {
    const program = makeProgram({ id: "city-util", statewide: false });
    const rows = [
      makeLocation({
        program_id: program.id,
        location_type: "CITY",
        location_value: "Los Angeles",
      }),
      makeLocation({
        program_id: program.id,
        location_type: "ELECTRIC_UTILITY",
        location_value: "LADWP",
      }),
    ];
    expect(classifyDirectoryLocation(program, rows, place)).toEqual({
      status: "keep",
      bucket: "unresolved",
    });
  });

  it("puts City of Los Angeles catalog programs in the local bucket", () => {
    const visible = consumerVisiblePrograms(programCatalog);
    const bySlug = new Map(visible.programs.map((program) => [program.slug, program]));
    const slugs = [
      "city-plants-free-trees",
      "lahd-handyworker",
      "los-angeles-lipa",
      "los-angeles-mipa",
    ] as const;
    const locationsByProgram = new Map<string, typeof visible.locations>();
    for (const location of visible.locations) {
      const rows = locationsByProgram.get(location.program_id) ?? [];
      rows.push(location);
      locationsByProgram.set(location.program_id, rows);
    }
    const results = applyDirectoryLocation(
      slugs.map((slug) => bySlug.get(slug)!),
      locationsByProgram,
      place,
    );
    for (const slug of slugs) {
      const item = results.find((row) => row.program.slug === slug);
      expect(item?.bucket).toBe("local");
      expect(item?.localReason).toBe("city");
    }
  });
});
