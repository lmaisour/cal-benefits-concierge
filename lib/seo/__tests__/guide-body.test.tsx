import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GuideArticle } from "@/components/seo/guide-article";
import { GuideBody, safeGuideHref } from "@/components/seo/guide-body";
import { parseGuideBody } from "@/lib/seo/guide-document";

const mixedBody = `Overview

A guide for applicants.
- Adults
Closing note.

Who may qualify

Income limits apply.
- California residents
- Apply before purchase

How to apply

1. Submit the official form.
2. Wait for written approval.

Apply and receive approval before purchasing or leasing.

Official source

Apply on the official program website
https://example.org/apply

DCAP eligibility requirements
https://example.org/eligibility

Related

Driving Clean Assistance Program
/programs/driving-clean-assistance-program
Browse programs
/programs
Check what you may qualify for
/check`;

describe("guide body", () => {
  it("renders legacy headings, lists, FAQs and labeled links", () => {
    const html = renderToStaticMarkup(
      <GuideBody
        body={
          "Overview\n\nA guide.\n\nWho may qualify\n\n- Adults\n- Residents\n\nFAQs\n\n1. Can I apply?\nConfirm with the administrator.\n\nOfficial source\n\nApply officially\nhttps://example.org/apply"
        }
      />,
    );
    expect(html).toContain("<h2");
    expect(html).toContain("<li>Adults</li>");
    expect(html).toContain("<h3");
    expect(html).toContain('href="https://example.org/apply"');
    expect(html).toContain("Apply officially");
  });

  it("groups mixed paragraphs and bullets into one list and converts every labeled link", () => {
    const parsed = parseGuideBody(mixedBody);
    const overview = parsed.sections.find((section) => section.heading === "Overview");
    expect(overview?.blocks.map((block) => block.type)).toEqual([
      "paragraph",
      "list",
      "paragraph",
    ]);
    const list = overview?.blocks.find((block) => block.type === "list");
    expect(list?.type === "list" ? list.items : []).toEqual(["Adults"]);
    expect(parsed.officialCta).toEqual({
      label: "Apply on the official program website",
      href: "https://example.org/apply",
    });
    expect(parsed.officialSources.map((item) => item.label)).toContain(
      "DCAP eligibility requirements",
    );
    expect(parsed.relatedLinks.map((item) => item.href)).toEqual([
      "/programs/driving-clean-assistance-program",
      "/programs",
      "/check",
    ]);
    expect(parsed.relatedLinks.some((item) => item.label.startsWith("/"))).toBe(false);
    expect(parsed.approvalWarning).toMatch(/approval before purchasing/i);

    const html = renderToStaticMarkup(<GuideBody body={mixedBody} />);
    expect(html.match(/<ul/g)?.length).toBeGreaterThanOrEqual(1);
    expect(html).toContain("DCAP eligibility requirements");
    expect(html).not.toContain(">/programs/driving-clean-assistance-program<");
  });

  it("renders numbered application steps only when the source text is numbered", () => {
    const html = renderToStaticMarkup(<GuideBody body={mixedBody} />);
    expect(html).toContain("<ol");
    expect(html).toContain("Submit the official form.");
    const unnumbered = renderToStaticMarkup(
      <GuideBody body={"How to apply\n\nUse the official form.\nConfirm with the administrator."} />,
    );
    expect(unnumbered).not.toContain("<ol");
  });

  it("escapes HTML and rejects executable or protocol-relative links", () => {
    expect(safeGuideHref("javascript:alert(1)")).toBe(false);
    expect(safeGuideHref("//evil.example")).toBe(false);
    const html = renderToStaticMarkup(<GuideBody body={"<script>alert(1)</script>"} />);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("guide article template", () => {
  it("uses one related-programs section and a consumer hero", () => {
    const html = renderToStaticMarkup(
      <GuideArticle
        title="Driving Clean Assistance Program"
        excerpt="Program status in our records: active. Helps income-qualified Californians buy a clean-air vehicle."
        slug="driving-clean-assistance-program"
        body={mixedBody}
        relatedPrograms={[
          {
            id: "1",
            name: "Driving Clean Assistance Program",
            slug: "driving-clean-assistance-program",
            short_description: "Clean vehicle grants.",
            status: "ACTIVE",
            active: true,
          },
        ]}
      />,
    );
    expect(html).toContain("Helps income-qualified Californians buy a clean-air vehicle.");
    expect(html).not.toContain("Program status in our records");
    expect(html.match(/Related programs/g)?.length).toBe(1);
    expect(html).not.toContain(">Related<");
    expect(html).toContain("Apply on the official program website");
    expect(html).toContain("Approval is required first");
    expect(html).toContain("At a glance");
    expect(html).not.toContain(">/programs<");
  });
});
