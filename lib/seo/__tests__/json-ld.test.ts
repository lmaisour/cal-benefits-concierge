import { describe, expect, it } from "vitest";
import { faqPageJsonLd, safeJsonLd } from "@/lib/seo/json-ld";

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
