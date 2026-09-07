import { describe, expect, it } from "vitest";
import { programCatalog } from "@/data/programs/index";
import { applyDirectoryLocation } from "@/lib/programs/directory-location";
import { resolveDirectoryPlaceFromZip } from "@/lib/programs/location-context";
import { consumerVisiblePrograms } from "@/lib/programs/import/catalog-to-engine";

const BATCH_7C_SLUGS = [
  "ladwp-used-ev-rebate",
  "ladwp-residential-ev-charger-rebate",
  "ladwp-consumer-rebate-program",
  "ladwp-attic-insulation-rebate",
  "ladwp-efficient-product-marketplace",
  "ladwp-power-savers",
  "ladwp-water-conservation-rebates",
  "ladwp-landscape-efficiency-assistance",
  "city-plants-free-trees",
  "la-metro-life",
  "south-coast-aqmd-replace-your-ride",
  "south-coast-aqmd-electric-lawn-garden-rebate",
  "lahd-handyworker",
  "los-angeles-lipa",
  "los-angeles-mipa",
] as const;

describe("Milestone 7C 91331 directory buckets", () => {
  it("resolves 91331 to place Pacoima and governing city Los Angeles", () => {
    const place = resolveDirectoryPlaceFromZip("91331");
    expect(place).toEqual({
      zip: "91331",
      place: "Pacoima",
      city: "Los Angeles",
      county: "Los Angeles",
      state: "CA",
    });
    expect(place.electricUtility).toBeUndefined();
  });

  it("places the batch using current matching, not forced local geography", () => {
    const visible = consumerVisiblePrograms(programCatalog);
    const bySlug = new Map(visible.programs.map((program) => [program.slug, program]));
    for (const slug of BATCH_7C_SLUGS) {
      expect(bySlug.has(slug)).toBe(true);
    }
    expect(bySlug.has("south-coast-aqmd-go-zero")).toBe(false);

    const locationsByProgram = new Map<string, typeof visible.locations>();
    for (const location of visible.locations) {
      const rows = locationsByProgram.get(location.program_id) ?? [];
      rows.push(location);
      locationsByProgram.set(location.program_id, rows);
    }

    const results = applyDirectoryLocation(
      BATCH_7C_SLUGS.map((slug) => bySlug.get(slug)!),
      locationsByProgram,
      resolveDirectoryPlaceFromZip("91331"),
    );
    const byResultSlug = new Map(results.map((item) => [item.program.slug, item]));

    expect(byResultSlug.get("la-metro-life")?.bucket).toBe("local");
    expect(byResultSlug.get("la-metro-life")?.localReason).toBe("county");
    expect(byResultSlug.get("city-plants-free-trees")?.bucket).toBe("local");
    expect(byResultSlug.get("lahd-handyworker")?.bucket).toBe("local");
    expect(byResultSlug.get("los-angeles-lipa")?.bucket).toBe("local");
    expect(byResultSlug.get("los-angeles-mipa")?.bucket).toBe("local");

    for (const slug of [
      "ladwp-used-ev-rebate",
      "ladwp-residential-ev-charger-rebate",
      "ladwp-consumer-rebate-program",
      "ladwp-attic-insulation-rebate",
      "ladwp-efficient-product-marketplace",
      "ladwp-power-savers",
      "ladwp-water-conservation-rebates",
      "ladwp-landscape-efficiency-assistance",
      "south-coast-aqmd-replace-your-ride",
      "south-coast-aqmd-electric-lawn-garden-rebate",
    ] as const) {
      expect(byResultSlug.get(slug)?.bucket).toBe("unresolved");
    }
  });
});
