import { describe, expect, it } from "vitest";
import { lookupParentMunicipality } from "@/data/geo/parent-municipalities";
import { lookupCaliforniaZip, resolveZipContext } from "@/lib/geo/resolve-zip-context";

describe("resolveZipContext", () => {
  it("resolves a San Francisco ZIP to matching place and city", () => {
    expect(resolveZipContext("94110")).toEqual({
      zip: "94110",
      place: "San Francisco",
      city: "San Francisco",
      county: "San Francisco",
      state: "CA",
    });
  });

  it("keeps GeoNames postal labels on the raw lookup", () => {
    expect(lookupCaliforniaZip("90012")).toEqual({
      city: "Los Angeles",
      county: "Los Angeles",
    });
    expect(lookupCaliforniaZip("91331")).toEqual({
      city: "Pacoima",
      county: "Los Angeles",
    });
  });

  it("resolves 91331 to place Pacoima and governing city Los Angeles", () => {
    expect(resolveZipContext("91331")).toEqual({
      zip: "91331",
      place: "Pacoima",
      city: "Los Angeles",
      county: "Los Angeles",
      state: "CA",
    });
  });

  it("does not treat other Los Angeles County cities as City of Los Angeles", () => {
    expect(resolveZipContext("90401")).toEqual({
      zip: "90401",
      place: "Santa Monica",
      city: "Santa Monica",
      county: "Los Angeles",
      state: "CA",
    });
    expect(resolveZipContext("90210")).toEqual({
      zip: "90210",
      place: "Beverly Hills",
      city: "Beverly Hills",
      county: "Los Angeles",
      state: "CA",
    });
  });

  it("resolves an Oakland ZIP to Alameda County", () => {
    expect(resolveZipContext("94612")).toEqual({
      zip: "94612",
      place: "Oakland",
      city: "Oakland",
      county: "Alameda",
      state: "CA",
    });
  });

  it("does not invent utility or district fields", () => {
    const context = resolveZipContext("94110");
    expect(context).not.toHaveProperty("electricUtility");
    expect(context).not.toHaveProperty("gasUtility");
    expect(context).not.toHaveProperty("cca");
  });

  it("returns ZIP only when the code is not in the California map", () => {
    expect(resolveZipContext("10001")).toEqual({ zip: "10001" });
  });
});

describe("lookupParentMunicipality", () => {
  it("applies only when the postal county matches the override", () => {
    expect(
      lookupParentMunicipality("91331", { city: "Pacoima", county: "Los Angeles" }),
    ).toEqual({ city: "Los Angeles", county: "Los Angeles" });
    expect(
      lookupParentMunicipality("91331", { city: "Pacoima", county: "Orange" }),
    ).toBeNull();
  });

  it("does not invent a parent city for unlisted ZIPs", () => {
    expect(
      lookupParentMunicipality("90401", { city: "Santa Monica", county: "Los Angeles" }),
    ).toBeNull();
  });
});
