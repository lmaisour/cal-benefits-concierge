import { describe, expect, it } from "vitest";
import { evaluateGeography } from "@/lib/eligibility/evaluate-geography";
import {
  makeLocation,
  makeProgram,
  statewideLocations,
} from "@/lib/eligibility/__tests__/fixtures";

describe("evaluateGeography", () => {
  it("PASSes statewide California programs", () => {
    const program = makeProgram({ id: "geo-state", statewide: true });
    const result = evaluateGeography(program, statewideLocations(program.id), {});
    expect(result.status).toBe("PASS");
    expect(result.explanation).toMatch(/statewide in California/i);
  });

  it("PASSes an exact ZIP match", () => {
    const program = makeProgram({ id: "geo-zip", statewide: false });
    const locations = [
      makeLocation({
        program_id: program.id,
        location_type: "STATE",
        location_value: "CA",
      }),
      makeLocation({
        program_id: program.id,
        location_type: "ZIP",
        location_value: "91331",
      }),
      makeLocation({
        program_id: program.id,
        location_type: "ZIP",
        location_value: "90012",
      }),
    ];
    const result = evaluateGeography(program, locations, { zip: "91331" });
    expect(result.status).toBe("PASS");
    expect(result.matchedLocations.map((row) => row.location_value)).toContain(
      "91331",
    );
  });

  it("FAILs a known ZIP mismatch", () => {
    const program = makeProgram({ id: "geo-zip-miss", statewide: false });
    const locations = [
      makeLocation({
        program_id: program.id,
        location_type: "ZIP",
        location_value: "91331",
      }),
    ];
    const result = evaluateGeography(program, locations, { zip: "10001" });
    expect(result.status).toBe("FAIL");
  });

  it("returns UNKNOWN when ZIP is required and missing", () => {
    const program = makeProgram({ id: "geo-zip-unknown", statewide: false });
    const locations = [
      makeLocation({
        program_id: program.id,
        location_type: "ZIP",
        location_value: "91331",
      }),
    ];
    const result = evaluateGeography(program, locations, {});
    expect(result.status).toBe("UNKNOWN");
    expect(result.explanation).toMatch(/need your ZIP code/i);
  });

  it("PASSes a matching electric utility", () => {
    const program = makeProgram({ id: "geo-util", statewide: false });
    const locations = [
      makeLocation({
        program_id: program.id,
        location_type: "ELECTRIC_UTILITY",
        location_value: "PG&E",
      }),
      makeLocation({
        program_id: program.id,
        location_type: "ELECTRIC_UTILITY",
        location_value: "SDG&E",
      }),
    ];
    const result = evaluateGeography(program, locations, {
      electric_utility: "pg&e",
    });
    expect(result.status).toBe("PASS");
  });

  it("PASSes a matching county", () => {
    const program = makeProgram({ id: "geo-county", statewide: false });
    const locations = [
      makeLocation({
        program_id: program.id,
        location_type: "COUNTY",
        location_value: "Los Angeles",
      }),
      makeLocation({
        program_id: program.id,
        location_type: "COUNTY",
        location_value: "Kern",
      }),
    ];
    const result = evaluateGeography(program, locations, { county: "kern" });
    expect(result.status).toBe("PASS");
  });

  it("does not infer utility from ZIP", () => {
    const program = makeProgram({ id: "geo-no-infer", statewide: false });
    const locations = [
      makeLocation({
        program_id: program.id,
        location_type: "ELECTRIC_UTILITY",
        location_value: "PG&E",
      }),
    ];
    const result = evaluateGeography(program, locations, { zip: "94110" });
    expect(result.status).toBe("UNKNOWN");
  });

  it("PASSes when ZIP and utility both match", () => {
    const program = makeProgram({ id: "geo-and-pass", statewide: false });
    const locations = zipAndUtilityLocations(program.id);
    const result = evaluateGeography(program, locations, {
      zip: "91331",
      electric_utility: "LADWP",
    });
    expect(result.status).toBe("PASS");
  });

  it("FAILs when ZIP matches and utility conflicts", () => {
    const program = makeProgram({ id: "geo-and-fail", statewide: false });
    const locations = zipAndUtilityLocations(program.id);
    const result = evaluateGeography(program, locations, {
      zip: "91331",
      electric_utility: "PG&E",
    });
    expect(result.status).toBe("FAIL");
    expect(result.conflictingTypes).toContain("ELECTRIC_UTILITY");
  });

  it("returns UNKNOWN when ZIP matches and utility is missing", () => {
    const program = makeProgram({ id: "geo-and-unknown", statewide: false });
    const locations = zipAndUtilityLocations(program.id);
    const result = evaluateGeography(program, locations, { zip: "91331" });
    expect(result.status).toBe("UNKNOWN");
    expect(result.unknownTypes).toContain("ELECTRIC_UTILITY");
  });

  it("PASSes the ZIP type when one of several ZIP rows matches", () => {
    const program = makeProgram({ id: "geo-zip-or", statewide: false });
    const locations = [
      makeLocation({
        program_id: program.id,
        location_type: "ZIP",
        location_value: "91331",
      }),
      makeLocation({
        program_id: program.id,
        location_type: "ZIP",
        location_value: "91340",
      }),
      makeLocation({
        program_id: program.id,
        location_type: "ZIP",
        location_value: "90012",
      }),
    ];
    const result = evaluateGeography(program, locations, { zip: "91340" });
    expect(result.status).toBe("PASS");
    expect(result.matchedLocations.map((row) => row.location_value)).toEqual([
      "91340",
    ]);
  });

  it("does not let STATE CA bypass a ZIP restriction", () => {
    const program = makeProgram({ id: "geo-state-zip", statewide: false });
    const locations = [
      makeLocation({
        program_id: program.id,
        location_type: "STATE",
        location_value: "CA",
      }),
      makeLocation({
        program_id: program.id,
        location_type: "ZIP",
        location_value: "91331",
      }),
    ];
    expect(evaluateGeography(program, locations, {}).status).toBe("UNKNOWN");
    expect(evaluateGeography(program, locations, { zip: "10001" }).status).toBe(
      "FAIL",
    );
    expect(evaluateGeography(program, locations, { zip: "91331" }).status).toBe(
      "PASS",
    );
  });
});

function zipAndUtilityLocations(programId: string) {
  return [
    makeLocation({
      program_id: programId,
      location_type: "ZIP",
      location_value: "91331",
    }),
    makeLocation({
      program_id: programId,
      location_type: "ELECTRIC_UTILITY",
      location_value: "LADWP",
    }),
  ];
}
