export const siteConfig = {
  name: "California Benefits Finder",
  shortName: "Benefits Finder",
  tagline:
    "Find rebates, credits, discounts and benefits you may qualify for.",
  description:
    "Answer a few questions and discover California rebates, credits, discounts, and assistance programs based on your household and location.",
  hero: {
    headline: "Find California benefits you're already eligible for.",
    subheadline:
      "Answer a few questions and discover rebates, credits, discounts and assistance programs based on your household and location.",
    primaryCta: "Check my benefits",
    secondaryCta: "Browse all programs",
  },
  trustStatement:
    "We link directly to official government and program sources.",
  disclaimer:
    "Eligibility is based on published program information and the details you provide. Program rules, funding and availability can change. Always confirm eligibility with the official program administrator.",
  urls: {
    home: "/",
    check: "/check",
    results: "/results",
    programs: "/programs",
    admin: "/admin",
  },
} as const;

export type SiteConfig = typeof siteConfig;
