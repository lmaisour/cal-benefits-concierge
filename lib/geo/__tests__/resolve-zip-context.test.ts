import { describe, expect, it } from "vitest";
import { lookupCaliforniaZip, resolveZipContext } from "@/lib/geo/resolve-zip-context";

describe("resolveZipContext", () => {
  it("resolves a San Francisco ZIP to city and county", () => {
    expect(resolveZipContext("94110")).toEqual({
      zip: "94110",
      city: "San Francisco",
      county: "San Francisco",
    });
  });

  it("resolves Los Angeles city ZIPs", () => {
    expect(lookupCaliforniaZip("90012")).toEqual({
      city: "Los Angeles",
      county: "Los Angeles",
    });
  });

  it("resolves an Oakland ZIP to Alameda County", () => {
    expect(resolveZipContext("94612")).toEqual({
      zip: "94612",
      city: "Oakland",
      county: "Alameda",
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
