import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProgramCard } from "@/components/programs/program-card";
import { ProgramDetailView } from "@/components/programs/program-detail";
import { ResultCard } from "@/components/results/result-card";
import { UNMODELED_REQUIRED_CRITERIA } from "@/data/programs/unmodeled-criteria";
import { programCatalog } from "@/data/programs/index";
import { editorialMetaDescription, editorialSeoTitle } from "@/lib/content/editorial";
import type { ConsumerProgramMatch } from "@/lib/eligibility/consumer-match";
import { toConsumerProgramMatch } from "@/lib/eligibility/consumer-match";
import { evaluateProgram } from "@/lib/eligibility/evaluate-program";
import {
  makeLocation,
  makeProgram,
  makeRule,
  statewideLocations,
} from "@/lib/eligibility/__tests__/fixtures";
import { catalogToEngine } from "@/lib/programs/import/catalog-to-engine";
import {
  catalogProgramHasPresentation,
  catalogProgramUpdateFields,
  catalogProgramWriteFields,
} from "@/lib/programs/import/program-row";
import { programPresentation } from "@/lib/programs/presentation";
import type { ProgramDetail } from "@/lib/programs/get-program-by-slug";

function catalogById(externalId: string) {
  const program = programCatalog.programs.find((item) => item.external_id === externalId);
  if (!program) {
    throw new Error(`Missing catalog program ${externalId}`);
  }
  return program;
}

function matchFromProgram(program = makeProgram()): ConsumerProgramMatch {
  const evaluation = evaluateProgram(
    program,
    [
      makeRule({
        program_id: program.id,
        field: "property_type",
        operator: "equals",
        value: "single_family",
      }),
    ],
    statewideLocations(program.id),
    { zip: "91331", household_size: 2, housing_status: "owner", property_type: "single_family" },
  );
  const match = toConsumerProgramMatch(evaluation);
  if (!match) {
    throw new Error("Expected a consumer match.");
  }
  return match;
}

function renderDetail(program = makeProgram()) {
  const detail: ProgramDetail = {
    program,
    rules: [],
    locations: [
      makeLocation({
        program_id: program.id,
        location_type: "STATE",
        location_value: "CA",
      }),
    ],
    sources: [],
    related: [],
    content: {
      program_id: program.id,
      seo_title: `${program.name} | Benefits Concierge`,
      meta_description: "Official program naming stays in metadata.",
      overview: "Overview copy.",
      benefit_explanation: "Benefit copy.",
      how_to_apply: null,
      documents_needed: null,
      important_notes: null,
      created_at: program.created_at,
      updated_at: program.updated_at,
    },
    faqs: [],
    relatedGuides: [],
  };
  return {
    detail,
    html: renderToStaticMarkup(
      createElement(ProgramDetailView, {
        detail,
        seoTitle: editorialSeoTitle(detail.program, detail.content),
        seoDescription: editorialMetaDescription(detail.program, detail.content),
      }),
    ),
  };
}

describe("consumer program naming", () => {
  it("uses the consumer headline as the primary card title and keeps the official name", () => {
    const program = makeProgram({
      name: "LA Metro LIFE Program",
      consumer_headline: "Free rides for 90 days",
      administrator: "Los Angeles County Metropolitan Transportation Authority",
      administrator_display_name: "LA Metro",
      audience_tags: ["Low income", "Transit", "Los Angeles County"],
    });
    const html = renderToStaticMarkup(createElement(ProgramCard, { program }));
    expect(html).toContain("<h2");
    expect(html).toContain("Free rides for 90 days");
    expect(html).toContain("LA Metro LIFE Program");
    expect(html).toContain("by LA Metro");
    expect(html).toContain("Low income");
    expect(html).toContain("Transit");
    expect(html).toContain("Los Angeles County");
    expect(html.indexOf("Free rides for 90 days")).toBeLessThan(
      html.indexOf("LA Metro LIFE Program"),
    );
  });

  it("falls back to the official name and canonical administrator", () => {
    const program = makeProgram({
      name: "Sample rebate",
      administrator: "Sample California Air District",
      consumer_headline: null,
      administrator_display_name: null,
      audience_tags: null,
    });
    const html = renderToStaticMarkup(createElement(ProgramCard, { program }));
    expect(html).toContain("Sample rebate");
    expect(html).toContain("by Sample California Air District");
    expect(html).not.toContain("Audience tags");
    expect(html.match(/<h2[\s\S]*Sample rebate/)).not.toBeNull();
  });

  it("hides the tag row when tags are absent", () => {
    const html = renderToStaticMarkup(
      createElement(ProgramCard, {
        program: makeProgram({ audience_tags: [] }),
      }),
    );
    expect(html).not.toContain("Audience tags");
  });

  it("keeps result-card eligibility status independent of the headline", () => {
    const match = matchFromProgram(
      makeProgram({
        name: "LA Metro LIFE Program",
        consumer_headline: "Free rides for 90 days",
        administrator_display_name: "LA Metro",
        audience_tags: ["Low income", "Transit"],
      }),
    );
    expect(match.eligibilityStatus).toBe("LIKELY_ELIGIBLE");
    const html = renderToStaticMarkup(createElement(ResultCard, { match }));
    expect(html).toContain("Free rides for 90 days");
    expect(html).toContain("LA Metro LIFE Program");
    expect(html).toContain("by LA Metro");
    expect(html).toContain("Likely match");
  });

  it("renders the consumer headline as the detail H1 and keeps official SEO naming", () => {
    const program = makeProgram({
      name: "LADWP Landscape Efficiency Assistance Program (LEAP)",
      consumer_headline: "Free front-yard landscaping",
      administrator: "Los Angeles Department of Water and Power",
      administrator_display_name: "LADWP",
      audience_tags: ["Single-family home", "LADWP water", "Homeowner or renter"],
    });
    const { detail, html } = renderDetail(program);
    expect(html).toMatch(/<h1[^>]*>Free front-yard landscaping<\/h1>/);
    expect(html).toContain("LADWP Landscape Efficiency Assistance Program (LEAP)");
    expect(html).toContain("by LADWP");
    expect(editorialSeoTitle(detail.program, detail.content)).toBe(
      "LADWP Landscape Efficiency Assistance Program (LEAP) | Benefits Concierge",
    );
    expect(html).toContain(
      "LADWP Landscape Efficiency Assistance Program (LEAP) | Benefits Concierge",
    );
    expect(html).toContain('"@type":"WebPage"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).not.toContain("Low income");
  });

  it("does not change matching outcomes when presentation fields are set", () => {
    const base = makeProgram({
      id: "naming-match",
      statewide: true,
    });
    const decorated = makeProgram({
      ...base,
      consumer_headline: "Free rides for 90 days",
      administrator_display_name: "LA Metro",
      audience_tags: ["Low income"],
    });
    const rules = [
      makeRule({
        program_id: base.id,
        field: "property_type",
        operator: "equals",
        value: "single_family",
      }),
    ];
    const locations = statewideLocations(base.id);
    const profile = {
      zip: "91331",
      household_size: 2,
      housing_status: "owner" as const,
      property_type: "single_family" as const,
    };
    const without = evaluateProgram(base, rules, locations, profile);
    const withFields = evaluateProgram(decorated, rules, locations, profile);
    expect(withFields.status).toBe(without.status);
    expect(withFields.ruleResults).toEqual(without.ruleResults);
    expect(withFields.geography).toEqual(without.geography);
  });
});

describe("seeded consumer presentation", () => {
  it("seeds LIFE, LEAP, City Plants, and ESA from verified facts", () => {
    const life = catalogById("LA-VEH-METRO-LIFE");
    expect(life.consumer_headline).toBe("Free rides for 90 days");
    expect(life.administrator_display_name).toBe("LA Metro");
    expect(life.audience_tags).toEqual(["Low income", "Transit", "Los Angeles County"]);
    expect(life.name).toBe("LA Metro LIFE Program");
    expect(UNMODELED_REQUIRED_CRITERIA["LA-VEH-METRO-LIFE"]).toMatch(
      /household-income table/i,
    );

    const leap = catalogById("LADWP-WATER-LEAP");
    expect(leap.consumer_headline).toBe("Free front-yard landscaping");
    expect(leap.administrator_display_name).toBe("LADWP");
    expect(leap.audience_tags).toEqual([
      "Single-family home",
      "LADWP water",
      "Homeowner or renter",
    ]);
    expect(leap.audience_tags).not.toContain("Low income");
    expect(leap.benefit_summary).toBe("Free front-yard landscaping");

    const cityPlants = catalogById("LA-HOME-CITY-PLANTS");
    expect(cityPlants.consumer_headline).toBe("Get up to 7 free trees");
    expect(cityPlants.administrator_display_name).toBe("City Plants");
    expect(cityPlants.audience_tags).toEqual(["Los Angeles", "Free trees"]);
    expect(cityPlants.audience_tags).not.toContain("Homeowner");

    const esa = catalogById("CA-UTIL-ESA");
    expect(esa.consumer_headline).toBe("Free home energy upgrades");
    expect(esa.administrator_display_name).toBeNull();
    expect(esa.audience_tags).toEqual(["Low income"]);
    expect(programPresentation(esa).administratorByline).toBe(
      "by California Public Utilities Commission",
    );
    expect(UNMODELED_REQUIRED_CRITERIA["CA-UTIL-ESA"]).toMatch(/federal poverty level/i);
  });

  it("preserves presentation fields through catalog-to-engine", () => {
    const engine = catalogToEngine(programCatalog);
    const leap = engine.programs.find((program) => program.external_id === "LADWP-WATER-LEAP");
    expect(leap?.consumer_headline).toBe("Free front-yard landscaping");
    expect(leap?.administrator_display_name).toBe("LADWP");
    expect(leap?.audience_tags).toEqual([
      "Single-family home",
      "LADWP water",
      "Homeowner or renter",
    ]);
  });

  it("does not wipe presentation fields when the catalog row leaves them null", () => {
    const program = catalogById("CA-VEH-MYFIRSTEV");
    expect(catalogProgramHasPresentation(program)).toBe(false);
    const update = catalogProgramUpdateFields(program);
    expect(update).not.toHaveProperty("consumer_headline");
    expect(update).not.toHaveProperty("administrator_display_name");
    expect(update).not.toHaveProperty("audience_tags");
    expect(catalogProgramWriteFields(program)).toHaveProperty("consumer_headline", null);
  });
});
