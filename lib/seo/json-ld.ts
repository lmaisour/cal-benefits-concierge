import { absoluteUrl, CANONICAL_ORIGIN } from "@/lib/seo/site-url";
import { siteConfig } from "@/lib/config/site";

export type JsonLd = Record<string, unknown>;

export const SITE_WEBSITE_ID = `${CANONICAL_ORIGIN}/#website`;
export const SITE_ORGANIZATION_ID = `${CANONICAL_ORIGIN}/#organization`;

export function safeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function toIsoDateTime(value: string | null | undefined): string | undefined {
  if (!value || !value.trim()) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
}

export function latestIsoDateTime(
  ...values: Array<string | null | undefined>
): string | undefined {
  const dates = values
    .map((value) => toIsoDateTime(value))
    .filter((value): value is string => Boolean(value));
  if (dates.length === 0) {
    return undefined;
  }
  return dates.sort()[dates.length - 1];
}

export function websiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_WEBSITE_ID,
    name: siteConfig.name,
    url: CANONICAL_ORIGIN,
  };
}

export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": SITE_ORGANIZATION_ID,
    name: siteConfig.name,
    url: CANONICAL_ORIGIN,
  };
}

export function siteIdentityJsonLd(): JsonLd[] {
  return [websiteJsonLd(), organizationJsonLd()];
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
  dateModified?: string | null;
}): JsonLd {
  const json: JsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    isPartOf: { "@id": SITE_WEBSITE_ID },
    publisher: { "@id": SITE_ORGANIZATION_ID },
  };
  const dateModified = toIsoDateTime(input.dateModified);
  if (dateModified) {
    json.dateModified = dateModified;
  }
  return json;
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

export function programPageJsonLd(input: {
  name: string;
  description: string;
  path: string;
  dateModified?: string | null;
  breadcrumbs: { name: string; path: string }[];
  faqs: { question: string; answer: string }[];
}): JsonLd[] {
  return [
    webPageJsonLd({
      name: input.name,
      description: input.description,
      path: input.path,
      dateModified: input.dateModified,
    }),
    breadcrumbJsonLd(input.breadcrumbs),
    faqPageJsonLd(input.faqs),
  ].filter((item): item is JsonLd => item !== null);
}
