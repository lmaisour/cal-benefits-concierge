/**
 * Deterministic content-opportunity scoring (v1).
 *
 * Total is clamped to 0–100. Dollar magnitude is never used as a bonus.
 * LOAN/FINANCING amounts are not treated as consumer savings.
 *
 * Positives:
 * - meaningful_consumer_benefit: +12 when a non-empty benefit summary/headline
 *   exists and the benefit type is a consumer benefit (including repayable types)
 * - non_repayable_value_kind: +10 when the benefit is not LOAN/FINANCING
 * - deadline_urgency: +10 / +6 / +3 by days remaining (90 / 180 / later)
 * - unusual_consumer_value: +8 when featured or free product/service or tax credit
 * - geographic_reach: +10 statewide, +6 county, +4 city
 * - strong_source_coverage: +8 official+2 sources, +5 official+1, +3 official only
 * - current_verification: +8 / +6 / +4 by recency (7 / 14 / 30 days)
 * - incomplete_editorial: +12 none, +8 missing gold fields
 * - missing_faq: +6 if <2 FAQs, +3 if exactly 2
 * - featured_status: +6 if featured
 * - internal_link_potential: +5 statewide, featured, or high-traffic category
 *
 * Penalties:
 * - stale_verification: -15 (defense in depth; discovery already excludes stale)
 * - uncertainty: -8 MEDIUM confidence
 * - duplicate_content: -20 near-duplicate title/slug against another program
 * - weak_source_coverage: -6 official URL only
 * - complicated_unmodeled_eligibility: -6 unmodeled required criteria
 * - unresolved_eligibility_complexity: -4 unmodeled and 4+ required rules
 */

import { NEEDS_REVIEW_AFTER_MS } from "@/lib/admin/needs-review";
import { isRepayableBenefit } from "@/lib/programs/labels";
import {
  calendarDaysBetween,
  parseUtcCalendarDate,
  utcToday,
} from "@/lib/programs/calendar";
import { isStaleVerification, verificationAgeMs } from "@/lib/content-pipeline/freshness";
import { missingEditorialFields } from "@/lib/content-pipeline/gold-standard";
import { collectOfficialSources } from "@/lib/content-pipeline/official-sources";
import { isSavingsBenefitType } from "@/types/program";
import type {
  DiscoveredOpportunity,
  DuplicateIndex,
  ScoreBreakdown,
  ScoreComponent,
  ScoredOpportunity,
} from "@/lib/content-pipeline/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const LINKABLE_CATEGORIES = new Set([
  "vehicles",
  "home-energy",
  "utilities",
  "housing",
  "water",
]);

function clamp(total: number): number {
  return Math.max(0, Math.min(100, total));
}

function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function hasNearDuplicate(
  opportunity: DiscoveredOpportunity,
  duplicates: DuplicateIndex | undefined,
): boolean {
  if (!duplicates) {
    return false;
  }
  const ownSlug = opportunity.proposed_slug;
  const ownTitles = new Set(
    [
      opportunity.proposed_title,
      opportunity.record.program.name,
      opportunity.record.program.consumer_headline ?? "",
      opportunity.record.content?.seo_title ?? "",
      opportunity.record.brief?.suggested_title ?? "",
    ]
      .map(normalizeTitle)
      .filter(Boolean),
  );
  for (const slug of duplicates.slugs) {
    if (slug !== ownSlug && slug === opportunity.proposed_slug) {
      return true;
    }
  }
  for (const title of duplicates.titles) {
    const normalized = normalizeTitle(title);
    if (!normalized || ownTitles.has(normalized)) {
      continue;
    }
    if (normalized === normalizeTitle(opportunity.proposed_title)) {
      return true;
    }
  }
  return false;
}

function add(
  components: ScoreComponent[],
  key: string,
  points: number,
  reason: string,
): void {
  components.push({ key, points, reason });
}

export function scoreOpportunity(
  opportunity: DiscoveredOpportunity,
  input: { now?: Date; duplicates?: DuplicateIndex } = {},
): ScoredOpportunity {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const program = opportunity.record.program;
  const components: ScoreComponent[] = [];
  const notes = [
    "Loan and financing amounts are not scored as consumer savings.",
    "Higher dollar values are not treated as automatically better.",
  ];

  const hasBenefitCopy = Boolean(
    program.benefit_summary?.trim() || program.consumer_headline?.trim(),
  );
  const meaningful =
    hasBenefitCopy &&
    (isSavingsBenefitType(program.benefit_type) ||
      program.benefit_type === "LOAN" ||
      program.benefit_type === "FINANCING" ||
      program.benefit_type === "OTHER");
  add(
    components,
    "meaningful_consumer_benefit",
    meaningful ? 12 : 0,
    meaningful
      ? "Program has a described consumer benefit."
      : "No meaningful consumer-benefit description.",
  );

  const repayable = isRepayableBenefit(program.benefit_type);
  add(
    components,
    "non_repayable_value_kind",
    repayable ? 0 : 10,
    repayable
      ? "Repayable loan/financing is not scored as savings."
      : "Benefit is a grant, rebate, credit, service, or similar non-repayable value.",
  );

  let deadlinePoints = 0;
  let deadlineReason = "No application deadline on the structured record.";
  const deadline = parseUtcCalendarDate(program.application_deadline);
  if (deadline) {
    const days = calendarDaysBetween(utcToday(now), deadline);
    if (days >= 0 && days <= 90) {
      deadlinePoints = 10;
      deadlineReason = `Application deadline is within 90 days (${days} days).`;
    } else if (days > 90 && days <= 180) {
      deadlinePoints = 6;
      deadlineReason = `Application deadline is within 180 days (${days} days).`;
    } else if (days > 180) {
      deadlinePoints = 3;
      deadlineReason = `Application deadline exists but is more than 180 days away (${days} days).`;
    } else {
      deadlineReason = "Application deadline is in the past; no urgency bonus.";
    }
  }
  add(components, "deadline_urgency", deadlinePoints, deadlineReason);

  const unusual =
    program.featured ||
    program.benefit_type === "FREE_SERVICE" ||
    program.benefit_type === "FREE_PRODUCT" ||
    program.benefit_type === "TAX_CREDIT";
  add(
    components,
    "unusual_consumer_value",
    unusual ? 8 : 0,
    unusual
      ? "Featured or uncommon free/tax-credit consumer value."
      : "No unusual-value signal beyond the standard benefit type.",
  );

  let geoPoints = 0;
  let geoReason = "Geography is local or unspecified.";
  if (program.statewide) {
    geoPoints = 10;
    geoReason = "Statewide California reach.";
  } else if (opportunity.record.locations.some((row) => row.location_type === "COUNTY")) {
    geoPoints = 6;
    geoReason = "County-level reach.";
  } else if (opportunity.record.locations.some((row) => row.location_type === "CITY")) {
    geoPoints = 4;
    geoReason = "City-level reach.";
  }
  add(components, "geographic_reach", geoPoints, geoReason);

  const officialSources = collectOfficialSources({
    official_url: program.official_url,
    sources: opportunity.record.sources,
  });
  const extraSources = officialSources.filter((source) => source.source_type !== "OFFICIAL_URL");
  let sourcePoints = 0;
  let sourceReason = "No official source.";
  if (officialSources.length >= 1 && extraSources.length >= 2) {
    sourcePoints = 8;
    sourceReason = "Official URL plus at least two catalog sources.";
  } else if (officialSources.length >= 1 && extraSources.length === 1) {
    sourcePoints = 5;
    sourceReason = "Official URL plus one catalog source.";
  } else if (officialSources.length >= 1) {
    sourcePoints = 3;
    sourceReason = "Official URL only.";
  }
  add(components, "strong_source_coverage", sourcePoints, sourceReason);

  const age = verificationAgeMs(program.last_verified_at, nowMs);
  let verifyPoints = 0;
  let verifyReason = "Verification timestamp is missing or unusable.";
  if (age !== null && age <= 7 * DAY_MS) {
    verifyPoints = 8;
    verifyReason = "Verified within 7 days.";
  } else if (age !== null && age <= 14 * DAY_MS) {
    verifyPoints = 6;
    verifyReason = "Verified within 14 days.";
  } else if (age !== null && age <= NEEDS_REVIEW_AFTER_MS) {
    verifyPoints = 4;
    verifyReason = "Verified within the 30-day freshness window.";
  }
  add(components, "current_verification", verifyPoints, verifyReason);

  const missing = missingEditorialFields(opportunity.record.content);
  let editorialPoints = 0;
  let editorialReason = "Editorial fields are complete.";
  if (!opportunity.record.content) {
    editorialPoints = 12;
    editorialReason = "No program_content yet.";
  } else if (missing.length > 0) {
    editorialPoints = 8;
    editorialReason = `Missing editorial fields: ${missing.join(", ")}.`;
  }
  add(components, "incomplete_editorial", editorialPoints, editorialReason);

  let faqPoints = 0;
  let faqReason = "At least three FAQs are already present.";
  if (opportunity.record.faqs.length < 2) {
    faqPoints = 6;
    faqReason = "Fewer than two FAQs.";
  } else if (opportunity.record.faqs.length === 2) {
    faqPoints = 3;
    faqReason = "Only two FAQs.";
  }
  add(components, "missing_faq", faqPoints, faqReason);

  add(
    components,
    "featured_status",
    program.featured ? 6 : 0,
    program.featured ? "Program is featured." : "Program is not featured.",
  );

  const linkable =
    program.statewide || program.featured || LINKABLE_CATEGORIES.has(program.category);
  add(
    components,
    "internal_link_potential",
    linkable ? 5 : 0,
    linkable
      ? "Statewide, featured, or a frequently linked category."
      : "Limited internal-link potential.",
  );

  add(
    components,
    "stale_verification",
    isStaleVerification(program.last_verified_at, nowMs) ? -15 : 0,
    isStaleVerification(program.last_verified_at, nowMs)
      ? "Verification is stale beyond the 30-day freshness window."
      : "Verification is within the freshness window.",
  );

  add(
    components,
    "uncertainty",
    program.confidence === "MEDIUM" ? -8 : 0,
    program.confidence === "MEDIUM"
      ? "MEDIUM confidence is a scoring penalty."
      : "Confidence is not MEDIUM.",
  );

  const duplicate = hasNearDuplicate(opportunity, input.duplicates);
  add(
    components,
    "duplicate_content",
    duplicate ? -20 : 0,
    duplicate
      ? "A near-duplicate title or slug already exists."
      : "No near-duplicate editorial title/slug detected.",
  );

  add(
    components,
    "weak_source_coverage",
    extraSources.length === 0 ? -6 : 0,
    extraSources.length === 0
      ? "Only the official URL is present; catalog source coverage is weak."
      : "At least one catalog source accompanies the official URL.",
  );

  add(
    components,
    "complicated_unmodeled_eligibility",
    program.has_unmodeled_required_criteria ? -6 : 0,
    program.has_unmodeled_required_criteria
      ? "Required eligibility is not fully modeled."
      : "No unmodeled required criteria flag.",
  );

  const requiredRules = opportunity.record.rules.filter((rule) => rule.required).length;
  const complex = program.has_unmodeled_required_criteria && requiredRules >= 4;
  add(
    components,
    "unresolved_eligibility_complexity",
    complex ? -4 : 0,
    complex
      ? "Unmodeled required criteria plus four or more required rules."
      : "Eligibility complexity is not in the highest penalty band.",
  );

  const total = clamp(components.reduce((sum, component) => sum + component.points, 0));
  const score_breakdown: ScoreBreakdown = {
    version: 1,
    total,
    components,
    notes,
  };

  return {
    ...opportunity,
    score: total,
    score_breakdown,
  };
}

export function scoreOpportunities(
  opportunities: DiscoveredOpportunity[],
  input: { now?: Date; duplicates?: DuplicateIndex } = {},
): ScoredOpportunity[] {
  return opportunities.map((opportunity) => scoreOpportunity(opportunity, input));
}
