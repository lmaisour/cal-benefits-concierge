import { absoluteUrl } from "@/lib/seo/site-url";

export type JsonLd = Record<string, unknown>;

export function safeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function breadcrumbJsonLd(
  items: { name: string; path: string }[],
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function webPageJsonLd(input: {
  name: string;
  description: string;
  path: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
  };
}

export function faqPageJsonLd(
  faqs: { question: string; answer: string }[],
): JsonLd | null {
  const usable = faqs.filter(
    (faq) => faq.question.trim().length > 0 && faq.answer.trim().length > 0,
  );
  if (usable.length === 0) {
    return null;
  }
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: usable.map((faq) => ({
      "@type": "Question",
      name: faq.question.trim(),
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer.trim(),
      },
    })),
  };
}
