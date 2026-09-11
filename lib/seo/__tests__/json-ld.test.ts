import { describe, expect, it } from "vitest";
import { CANONICAL_ORIGIN } from "@/lib/seo/site-url";
import {
  faqPageJsonLd,
  latestIsoDateTime,
  organizationJsonLd,
  programPageJsonLd,
  safeJsonLd,
  SITE_ORGANIZATION_ID,
  SITE_WEBSITE_ID,
  siteIdentityJsonLd,
  webPageJsonLd,
  websiteJsonLd,
} from "@/lib/seo/json-ld";

describe("faqPageJsonLd", () => {
  it("returns null when there are no usable FAQs", () => {
    expect(faqPageJsonLd([])).toBeNull();
    expect(faqPageJsonLd([{ question: " ", answer: "Yes" }])).toBeNull();
  });

  it("emits FAQPage JSON-LD only for stored questions", () => {
    const json = faqPageJsonLd([
      { question: "Who may qualify?", answer: "Confirm with the administrator." },
    ]);
    expect(json).toMatchObject({
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Who may qualify?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Confirm with the administrator.",
          },
        },
      ],
    });
  });
});

describe("safeJsonLd", () => {
  it("escapes closing script tags in user content", () => {
    const encoded = safeJsonLd({
      "@type": "Answer",
      text: "</script><script>alert(1)",
    });
    expect(encoded).not.toContain("</script>");
    expect(encoded).toContain("\\u003c/script>");
  });
});

describe("site identity JSON-LD", () => {
  it("emits WebSite JSON-LD with the canonical origin and a stable @id", () => {
    expect(websiteJsonLd()).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": SITE_WEBSITE_ID,
      name: "Benefits Concierge",
      url: CANONICAL_ORIGIN,
    });
    expect(SITE_WEBSITE_ID).toBe("https://benefitsconcierge.org/#website");
  });

  it("emits Organization JSON-LD with name, URL, and a stable @id", () => {
    expect(organizationJsonLd()).toEqual({
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": SITE_ORGANIZATION_ID,
      name: "Benefits Concierge",
      url: CANONICAL_ORIGIN,
    });
    expect(SITE_ORGANIZATION_ID).toBe("https://benefitsconcierge.org/#organization");
  });

  it("does not invent a logo and keeps a single site-level identity graph", () => {
    const graph = siteIdentityJsonLd();
    expect(graph).toHaveLength(2);
    expect(graph.map((node) => node["@type"])).toEqual(["WebSite", "Organization"]);
    for (const node of graph) {
      expect(node).not.toHaveProperty("logo");
    }
  });
});

describe("program WebPage JSON-LD", () => {
  it("includes dateModified only when a real timestamp exists", () => {
    const withoutDate = webPageJsonLd({
      name: "Sample program",
      description: "A program page",
      path: "/programs/sample",
    });
    expect(withoutDate.dateModified).toBeUndefined();

    const invalid = webPageJsonLd({
      name: "Sample program",
      description: "A program page",
      path: "/programs/sample",
      dateModified: "not-a-date",
    });
    expect(invalid.dateModified).toBeUndefined();

    const withDate = webPageJsonLd({
      name: "Sample program",
      description: "A program page",
      path: "/programs/sample",
      dateModified: "2026-09-10T19:26:42.122Z",
    });
    expect(withDate.dateModified).toBe("2026-09-10T19:26:42.122Z");
    expect(latestIsoDateTime("2026-01-01T00:00:00.000Z", "2026-09-10T19:26:42.122Z")).toBe(
      "2026-09-10T19:26:42.122Z",
    );
  });

  it("links program WebPage JSON-LD to the site identity", () => {
    const json = webPageJsonLd({
      name: "Sample program",
      description: "A program page",
      path: "/programs/sample",
      dateModified: "2026-09-10T19:26:42.122Z",
    });
    expect(json.isPartOf).toEqual({ "@id": SITE_WEBSITE_ID });
    expect(json.publisher).toEqual({ "@id": SITE_ORGANIZATION_ID });
    expect(json.url).toBe(`${CANONICAL_ORIGIN}/programs/sample`);
  });

  it("still emits FAQ and breadcrumb schema alongside WebPage", () => {
    const graph = programPageJsonLd({
      name: "Sample program",
      description: "A program page",
      path: "/programs/sample",
      dateModified: "2026-09-10T19:26:42.122Z",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Programs", path: "/programs" },
        { name: "Sample program", path: "/programs/sample" },
      ],
      faqs: [{ question: "Who may qualify?", answer: "Confirm with the administrator." }],
    });
    expect(graph.map((node) => node["@type"])).toEqual([
      "WebPage",
      "BreadcrumbList",
      "FAQPage",
    ]);
    expect(graph[1]).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "Home" },
        { position: 2, name: "Programs" },
        { position: 3, name: "Sample program" },
      ],
    });
    expect(graph[2]).toMatchObject({
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Who may qualify?",
        },
      ],
    });
  });
});
