import { describe, expect, it } from "vitest";
import {
  normalizeAudienceTags,
  parseAudienceTagsInput,
  programPresentation,
} from "@/lib/programs/presentation";

describe("programPresentation", () => {
  it("prefers the consumer headline and short administrator label", () => {
    const display = programPresentation({
      name: "LA Metro LIFE Program",
      administrator: "Los Angeles County Metropolitan Transportation Authority",
      consumer_headline: "Free rides for 90 days",
      administrator_display_name: "LA Metro",
      audience_tags: ["Low income", "Transit"],
    });
    expect(display.primaryTitle).toBe("Free rides for 90 days");
    expect(display.officialName).toBe("LA Metro LIFE Program");
    expect(display.showOfficialSubtitle).toBe(true);
    expect(display.administratorByline).toBe("by LA Metro");
    expect(display.tags).toEqual(["Low income", "Transit"]);
  });

  it("falls back to the official name and canonical administrator", () => {
    const display = programPresentation({
      name: "Energy Savings Assistance",
      administrator: "California Public Utilities Commission",
      consumer_headline: null,
      administrator_display_name: null,
      audience_tags: null,
    });
    expect(display.primaryTitle).toBe("Energy Savings Assistance");
    expect(display.showOfficialSubtitle).toBe(false);
    expect(display.administratorByline).toBe(
      "by California Public Utilities Commission",
    );
    expect(display.tags).toEqual([]);
  });
});

describe("audience tag parsing", () => {
  it("trims, drops empties, and removes duplicates", () => {
    expect(parseAudienceTagsInput("Low income\n\nTransit\nlow income\n, Los Angeles County")).toEqual([
      "Low income",
      "Transit",
      "Los Angeles County",
    ]);
    expect(normalizeAudienceTags(["  ", "Homeowner", "Homeowner"])).toEqual(["Homeowner"]);
  });
});
