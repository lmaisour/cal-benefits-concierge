import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GuideBody, safeGuideHref } from "@/components/seo/guide-body";

describe("guide body", () => {
  it("renders legacy headings, lists, FAQs and labeled links", () => {
    const html = renderToStaticMarkup(<GuideBody body={"Overview\n\nA guide.\n\nWho may qualify\n\n- Adults\n- Residents\n\nFAQs\n\n1. Can I apply?\nConfirm with the administrator.\n\nOfficial source\n\nApply officially\nhttps://example.org/apply"} />);
    expect(html).toContain("<h2");
    expect(html).toContain("<li>Adults</li>");
    expect(html).toContain("<h3");
    expect(html).toContain('href="https://example.org/apply"');
  });
  it("escapes HTML and rejects executable or protocol-relative links", () => {
    expect(safeGuideHref("javascript:alert(1)")).toBe(false);
    expect(safeGuideHref("//evil.example")).toBe(false);
    const html = renderToStaticMarkup(<GuideBody body={'<script>alert(1)</script>'} />);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
