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

  it("ORs different restrictive types so a ZIP match is enough", () => {
    const program = makeProgram({ id: "geo-or-types", statewide: false });
    const locations = [
      makeLocation({
        program_id: program.id,
        location_type: "ZIP",
        location_value: "93722",
      }),
      makeLocation({
        program_id: program.id,
        location_type: "CITY",
        location_value: "Fresno",
      }),
      makeLocation({
        program_id: program.id,
        location_type: "COUNTY",
        location_value: "Fresno",
      }),
    ];
    const result = evaluateGeography(program, locations, { zip: "93722" });
    expect(result.status).toBe("PASS");
  });
});
