import { describe, expect, it } from "vitest";
import { formatLocationCoverageLines } from "@/lib/programs/format-location-coverage";
import { makeLocation } from "@/lib/eligibility/__tests__/fixtures";

const DIAGNOSTIC = "Geographic coverage is listed as California, but is not statewide.";

describe("formatLocationCoverageLines", () => {
  it("never uses internal diagnostic wording", () => {
    const lines = formatLocationCoverageLines(false, [
      makeLocation({
        program_id: "p",
        location_type: "STATE",
        location_value: "CA",
      }),
    ]);
    expect(lines.join(" ")).not.toContain(DIAGNOSTIC);
    expect(lines).toEqual(["Service area needs to be confirmed"]);
  });

  it("describes statewide programs", () => {
    expect(formatLocationCoverageLines(true, [])).toEqual(["Statewide in California"]);
  });

  it("describes a city in consumer language", () => {
    const lines = formatLocationCoverageLines(false, [
      makeLocation({
        program_id: "p",
        location_type: "CITY",
        location_value: "San Francisco",
      }),
    ]);
    expect(lines).toEqual(["Available in San Francisco"]);
  });

  it("describes a county in consumer language", () => {
    const lines = formatLocationCoverageLines(false, [
      makeLocation({
        program_id: "p",
        location_type: "COUNTY",
        location_value: "San Francisco",
      }),
    ]);
    expect(lines).toEqual(["Available in San Francisco County"]);
  });

  it("describes a ZIP in consumer language", () => {
    const lines = formatLocationCoverageLines(false, [
      makeLocation({
        program_id: "p",
        location_type: "ZIP",
        location_value: "94110",
      }),
    ]);
    expect(lines).toEqual(["Available in ZIP 94110"]);
  });

  it("names a utility only from structured location data", () => {
    const lines = formatLocationCoverageLines(false, [
      makeLocation({
        program_id: "p",
        location_type: "ELECTRIC_UTILITY",
        location_value: "Ava Community Energy",
      }),
    ]);
    expect(lines).toEqual(["Available to eligible Ava Community Energy customers"]);
  });

  it("focuses directory cards on the user's matching county", () => {
    const lines = formatLocationCoverageLines(
      false,
      [
        makeLocation({ program_id: "p", location_type: "COUNTY", location_value: "Alameda" }),
        makeLocation({
          program_id: "p",
          location_type: "COUNTY",
          location_value: "San Francisco",
        }),
        makeLocation({ program_id: "p", location_type: "COUNTY", location_value: "San Mateo" }),
      ],
      { focusPlace: { zip: "94110", city: "San Francisco", county: "San Francisco" } },
    );
    expect(lines).toEqual(["Available in San Francisco County"]);
  });

  it("focuses directory cards on a matching city when no county row matches", () => {
    const lines = formatLocationCoverageLines(
      false,
      [makeLocation({ program_id: "p", location_type: "CITY", location_value: "Los Angeles" })],
      { focusPlace: { zip: "90012", city: "Los Angeles", county: "Los Angeles" } },
    );
    expect(lines).toEqual(["Available in Los Angeles"]);
  });

  it("keeps the full county list on the detail path when place is not focused", () => {
    const lines = formatLocationCoverageLines(false, [
      makeLocation({ program_id: "p", location_type: "COUNTY", location_value: "Alameda" }),
      makeLocation({ program_id: "p", location_type: "COUNTY", location_value: "San Francisco" }),
    ]);
    expect(lines).toEqual(["Available in Alameda County and San Francisco County"]);
  });
});
