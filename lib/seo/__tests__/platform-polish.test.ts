import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { ProgramAtAGlance } from "@/components/programs/at-a-glance";
import {
  makeLocation,
  makeProgram,
  makeRule,
} from "@/lib/eligibility/__tests__/fixtures";
import { siteIdentityJsonLd } from "@/lib/seo/json-ld";
import { CANONICAL_ORIGIN } from "@/lib/seo/site-url";

describe("site-level JSON-LD emission", () => {
  it("renders WebSite and Organization JSON-LD with canonical URL and stable ids", () => {
    const html = renderToStaticMarkup(
      createElement(JsonLdScript, { data: siteIdentityJsonLd() }),
    );
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain('"@type":"WebSite"');
    expect(html).toContain('"@type":"Organization"');
    expect(html).toContain(`"url":"${CANONICAL_ORIGIN}"`);
    expect(html).toContain('"name":"Benefits Concierge"');
    expect(html).toContain(`${CANONICAL_ORIGIN}/#website`);
    expect(html).toContain(`${CANONICAL_ORIGIN}/#organization`);
    expect(html).not.toContain('"logo"');
  });
});

describe("At a glance rendering", () => {
  it("renders known structured facts and omits unknown income or homeownership", () => {
    const program = makeProgram({
      benefit_min: 100,
      benefit_max: 500,
      last_verified_at: "2026-08-01T00:00:00Z",
    });
    const html = renderToStaticMarkup(
      createElement(ProgramAtAGlance, {
        program,
        rules: [],
        locations: [
          makeLocation({
            program_id: program.id,
            location_type: "CITY",
            location_value: "Oakland",
          }),
        ],
      }),
    );
    expect(html).toContain("At a glance");
    expect(html).toContain("Benefit");
    expect(html).toContain("Up to $500");
    expect(html).toContain("Current status");
    expect(html).toContain("Active");
    expect(html).toContain("Available in Oakland");
    expect(html).toContain("Sample administrator");
    expect(html).not.toContain("Income");
    expect(html).not.toContain("Homeownership");
    expect(html).not.toMatch(/no income requirement/i);

    const withKnownRules = renderToStaticMarkup(
      createElement(ProgramAtAGlance, {
        program,
        rules: [
          makeRule({
            program_id: program.id,
            field: "household_income",
            operator: "less_than_or_equal",
            value: 80000,
            explanation: "Household income must be $80,000 or less.",
          }),
        ],
        locations: [],
      }),
    );
    expect(withKnownRules).toContain("Income");
    expect(withKnownRules).toContain("Household income must be $80,000 or less.");
  });
});
