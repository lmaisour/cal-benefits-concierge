import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isPreviewReviewEnabled } from "@/lib/guides/preview-access";
import {
  DCAP_PREVIEW_FIXTURE,
  DCAP_SOURCE_VERIFICATION,
  getPreviewGuideFixture,
  listPreviewGuideSlugs,
} from "@/lib/guides/preview-fixtures";
import { parseGuideBody } from "@/lib/seo/guide-document";

describe("preview review access", () => {
  it("never enables preview fixtures on Production", () => {
    expect(
      isPreviewReviewEnabled({ NODE_ENV: "production", VERCEL_ENV: "production" }),
    ).toBe(false);
    expect(
      isPreviewReviewEnabled({ NODE_ENV: "production" }),
    ).toBe(false);
  });

  it("enables fixtures on Vercel Preview and local development", () => {
    expect(
      isPreviewReviewEnabled({ NODE_ENV: "production", VERCEL_ENV: "preview" }),
    ).toBe(true);
    expect(isPreviewReviewEnabled({ NODE_ENV: "development" })).toBe(true);
  });
});

describe("preview DCAP fixture", () => {
  it("is isolated from listings and keeps descriptive source links", () => {
    expect(listPreviewGuideSlugs()).toEqual(["driving-clean-assistance-program"]);
    const fixture = getPreviewGuideFixture("driving-clean-assistance-program");
    expect(fixture?.title).toBe("Driving Clean Assistance Program");
    expect(fixture?.excerpt).not.toMatch(/program status in our records/i);
    const parsed = parseGuideBody(DCAP_PREVIEW_FIXTURE.body);
    expect(parsed.officialCta?.href).toBe(
      "https://chdc.my.site.com/dcap/s/application?language=en_US",
    );
    expect(parsed.relatedLinks.some((item) => item.label.startsWith("/"))).toBe(false);
    expect(parsed.officialSources.map((item) => item.label).join(" ")).not.toMatch(
      /\/our-work\/programs/,
    );
    expect(fixture?.body).toMatch(/August 21, 2026/);
    expect(fixture?.body).toMatch(/\$12,000/);
    expect(fixture?.body).not.toMatch(/How much could I receive\?[\s\S]*not listed/);
  });

  it("records official sources and does not write to Production data stores", () => {
    expect(DCAP_SOURCE_VERIFICATION.verified_on).toBe("2026-09-20");
    expect(DCAP_SOURCE_VERIFICATION.sources.map((source) => source.url)).toEqual(
      expect.arrayContaining([
        "https://drivingcleanca.org/",
        "https://drivingcleanca.org/about-us/dcap-eligibility/",
        "https://drivingcleanca.org/about-us/frequently-asked-questions/",
        "https://ww2.arb.ca.gov/our-work/programs/driving-clean-assistance-program/about",
        "https://chdc.my.site.com/dcap/s/application?language=en_US",
      ]),
    );
    expect(DCAP_SOURCE_VERIFICATION.conflicts.length).toBeGreaterThan(0);

    const fixtureSource = readFileSync(
      path.join(process.cwd(), "lib/guides/preview-fixtures.ts"),
      "utf8",
    );
    const pageSource = readFileSync(
      path.join(process.cwd(), "app/guides/preview/[slug]/page.tsx"),
      "utf8",
    );
    expect(fixtureSource).not.toMatch(/from ["']@\/lib\/supabase|publishGuide|runContentAutomation/);
    expect(pageSource).not.toMatch(/from ["']@\/lib\/supabase|publishGuide|runContentAutomation/);
    expect(pageSource).toMatch(/index: false/);
  });
});
