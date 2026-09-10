export const siteConfig = {
  name: "Benefits Concierge",
  shortName: "Benefits Concierge",
  tagline: "Find California benefits you may qualify for.",
  description:
    "Find California benefits you may qualify for. Answer a few questions to discover rebates, credits, discounts, and assistance programs based on your household and location.",
  origin: "https://benefitsconcierge.org",
  hero: {
    headline: "Find California benefits you may qualify for.",
    subheadline:
      "Answer a few questions and discover rebates, credits, discounts and assistance programs based on your household and location.",
    primaryCta: "Check what you qualify for",
    secondaryCta: "Browse all programs",
  },
  featured: {
    heading: "Programs worth knowing about",
    supporting:
      "From clean vehicles and home upgrades to free trees and transit discounts, California has programs many residents don't know they qualify for.",
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
    guides: "/guides",
    admin: "/admin",
  },
} as const;

export type SiteConfig = typeof siteConfig;
