import { benefitTypeLabel, fieldLabel } from "@/lib/programs/labels";
import {
  formatUtcCalendarDate,
  parseUtcCalendarDate,
} from "@/lib/programs/calendar";
import { looksLikeSynthesizedRange } from "@/lib/content-pipeline/amount-structure";
import {
  renderFaqs,
  renderFactualSection,
} from "@/lib/content-pipeline/claims";
import { safeConsumerHeadline } from "@/lib/content-pipeline/headline-safety";
import {
  sequencingActionFromEvidence,
  sequencingCopy,
} from "@/lib/content-pipeline/sequencing";
import type {
  ContentDraft,
  ContentDraftProvider,
  EvidencePackage,
  FactualDraftSection,
  ScoredOpportunity,
  SourceClaim,
  SuggestedOfficialCta,
} from "@/lib/content-pipeline/types";

const SEO_TITLE_MAX = 70;

export class FakeContentDraftProvider implements ContentDraftProvider {
  readonly id = "fake";

  async generateDraft(input: {
    evidence: EvidencePackage;
    opportunity: ScoredOpportunity;
  }): Promise<ContentDraft> {
    return buildDeterministicDraft(input.evidence, input.opportunity);
  }
}

export async function generateDraft(input: {
  provider: ContentDraftProvider;
  evidence: EvidencePackage;
  opportunity: ScoredOpportunity;
}): Promise<ContentDraft> {
  return input.provider.generateDraft({
    evidence: input.evidence,
    opportunity: input.opportunity,
  });
}

function claim(
  claim_id: string,
  text: string,
  evidence_path: string,
  source_url: string | null,
  section: FactualDraftSection,
): SourceClaim {
  return { claim_id, text, evidence_path, source_url, section };
}

function asSentence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function formatAmount(value: number): string {
  return `$${value.toLocaleString("en-US")}`;
}

export function formatTierEntry(tier: {
  amount: number | null;
  label: string;
  condition_summary: string;
}): string {
  const amountLine = tier.amount !== null ? formatAmount(tier.amount) : tier.label;
  return `${amountLine}\n${tier.condition_summary}`;
}

function officialSourceUrl(evidence: EvidencePackage): string | null {
  return evidence.official_sources[0]?.url ?? null;
}

function applyHref(evidence: EvidencePackage): string | null {
  return (
    evidence.application.application_url ??
    evidence.application.official_url ??
    evidence.official_sources[0]?.url ??
    null
  );
}

function administratorName(evidence: EvidencePackage): string {
  return (
    evidence.administrator_display_name?.trim() ||
    evidence.administrator?.trim() ||
    "the program administrator"
  );
}

function administratorPath(evidence: EvidencePackage): string {
  return evidence.administrator_display_name?.trim()
    ? "administrator_display_name"
    : "administrator";
}

export function officialApplicationCta(
  evidence: EvidencePackage,
): SuggestedOfficialCta | null {
  const href = applyHref(evidence);
  if (!href) {
    return null;
  }
  const name =
    evidence.administrator_display_name?.trim() || evidence.administrator?.trim();
  return {
    href,
    label: name
      ? `Apply on the official ${name} website`
      : "Apply on the official program website",
  };
}

export function isOptionalDefaultClaim(claim: SourceClaim): boolean {
  return (
    /^faq-[qa]-tier-\d+$/.test(claim.claim_id) ||
    claim.claim_id === "faq-q-only" ||
    claim.claim_id === "faq-a-only"
  );
}

export function selectDefaultClaims(allowed: SourceClaim[]): SourceClaim[] {
  return allowed.filter((item) => !isOptionalDefaultClaim(item));
}

function canUseBenefitSummary(
  evidence: EvidencePackage,
  summary: string,
): boolean {
  if (!summary) {
    return false;
  }
  const structure = evidence.benefit.amount_structure;
  if (structure === "RANGE" || structure === "SINGLE") {
    return true;
  }
  return !looksLikeSynthesizedRange(summary);
}

function geographyClaim(
  evidence: EvidencePackage,
  sourceUrl: string | null,
): SourceClaim {
  if (evidence.geography.statewide) {
    return claim(
      "overview-geography",
      "Available statewide in California.",
      "geography.statewide",
      sourceUrl,
      "overview",
    );
  }
  const locations =
    evidence.geography.locations
      .map((location) => location.value)
      .filter(Boolean)
      .join(", ") || "a limited service area";
  return claim(
    "overview-geography",
    `Available in ${locations}.`,
    evidence.geography.locations[0]
      ? "geography.locations.0.value"
      : "geography.statewide",
    sourceUrl,
    "overview",
  );
}

function titleClaims(
  evidence: EvidencePackage,
  sourceUrl: string | null,
): SourceClaim[] {
  const headline = safeConsumerHeadline(evidence);
  const claims: SourceClaim[] = [];

  if (headline) {
    const combined = `${headline} | ${evidence.official_name}`;
    if (combined.length <= SEO_TITLE_MAX) {
      claims.push(
        claim(
          "seo-title-headline",
          headline,
          "consumer_headline",
          sourceUrl,
          "seo_title",
        ),
        claim(
          "seo-title-name",
          evidence.official_name,
          "official_name",
          sourceUrl,
          "seo_title",
        ),
      );
    } else {
      claims.push(
        claim(
          "seo-title-headline",
          headline,
          "consumer_headline",
          sourceUrl,
          "seo_title",
        ),
      );
    }
  } else {
    claims.push(
      claim(
        "seo-title-name",
        evidence.official_name,
        "official_name",
        sourceUrl,
        "seo_title",
      ),
    );
  }

  claims.push(
    claim(
      "meta-name",
      evidence.official_name,
      "official_name",
      sourceUrl,
      "meta_description",
    ),
    claim(
      "meta-suffix",
      evidence.boilerplate.meta_description_suffix,
      "boilerplate.meta_description_suffix",
      sourceUrl,
      "meta_description",
    ),
  );

  if (headline) {
    claims.push(
      claim("h1-headline", headline, "consumer_headline", sourceUrl, "h1"),
    );
  } else {
    claims.push(
      claim("h1-name", evidence.official_name, "official_name", sourceUrl, "h1"),
    );
  }
  return claims;
}

function overviewClaims(
  evidence: EvidencePackage,
  sourceUrl: string | null,
): SourceClaim[] {
  const claims: SourceClaim[] = [];
  const description = evidence.short_description?.trim();
  if (description) {
    claims.push(
      claim(
        "overview-does",
        asSentence(description),
        "short_description",
        sourceUrl,
        "overview",
      ),
    );
  }
  claims.push(
    claim(
      "overview-admin",
      `${evidence.official_name} is administered by ${administratorName(evidence)}.`,
      administratorPath(evidence),
      sourceUrl,
      "overview",
    ),
    geographyClaim(evidence, sourceUrl),
  );

  if (evidence.benefit.repayable) {
    claims.push(
      claim(
        "overview-benefit-repayable",
        `${evidence.official_name} is ${benefitTypeLabel(evidence.benefit.type).toLowerCase()}, which must be repaid. Treat it as financing, not a grant or cash award.`,
        "benefit.repayable",
        sourceUrl,
        "overview",
      ),
    );
    return claims;
  }

  const structure = evidence.benefit.amount_structure;
  const summary = evidence.benefit.summary?.trim() ?? "";
  if (structure === "TIERED") {
    claims.push(
      claim(
        "overview-benefit-guidance",
        evidence.boilerplate.overview_tiered_guidance,
        "boilerplate.overview_tiered_guidance",
        sourceUrl,
        "overview",
      ),
    );
  } else if (canUseBenefitSummary(evidence, summary)) {
    claims.push(
      claim(
        "overview-benefit-summary",
        asSentence(summary),
        "benefit.summary",
        sourceUrl,
        "overview",
      ),
    );
  } else if (structure === "UNKNOWN") {
    claims.push(
      claim(
        "overview-benefit-unknown",
        evidence.boilerplate.unknown_amount_guidance,
        "boilerplate.unknown_amount_guidance",
        sourceUrl,
        "overview",
      ),
    );
  } else {
    claims.push(
      claim(
        "overview-benefit-type",
        `This is a ${benefitTypeLabel(evidence.benefit.type).toLowerCase()} program.`,
        "benefit.type",
        sourceUrl,
        "overview",
      ),
    );
  }

  return claims;
}

function whatYouGetClaims(
  evidence: EvidencePackage,
  sourceUrl: string | null,
): SourceClaim[] {
  const claims: SourceClaim[] = [];
  if (evidence.benefit.repayable) {
    claims.push(
      claim(
        "benefit-repayable",
        `${evidence.official_name} is ${benefitTypeLabel(evidence.benefit.type).toLowerCase()}, which must be repaid. Treat it as financing, not a grant or cash award.`,
        "benefit.repayable",
        sourceUrl,
        "what_you_get",
      ),
    );
    return claims;
  }

  const structure = evidence.benefit.amount_structure;
  const summary = evidence.benefit.summary?.trim() ?? "";

  if (structure === "TIERED") {
    claims.push(
      claim(
        "benefit-intro",
        evidence.boilerplate.tiered_amount_guidance,
        "boilerplate.tiered_amount_guidance",
        sourceUrl,
        "what_you_get",
      ),
    );
    evidence.benefit.tiers.forEach((tier, index) => {
      claims.push(
        claim(
          `benefit-tier-${index}`,
          formatTierEntry(tier),
          `benefit.tiers.${index}.condition_summary`,
          sourceUrl,
          "what_you_get",
        ),
      );
    });
    return claims;
  }

  if (canUseBenefitSummary(evidence, summary) && structure !== "RANGE") {
    claims.push(
      claim(
        "benefit-summary",
        asSentence(summary),
        "benefit.summary",
        sourceUrl,
        "what_you_get",
      ),
    );
  }

  if (structure === "SINGLE" && evidence.benefit.amounts_are_structured_facts) {
    const amount = evidence.benefit.min ?? evidence.benefit.max;
    const path = evidence.benefit.min !== null ? "benefit.min" : "benefit.max";
    if (amount !== null) {
      claims.push(
        claim(
          "benefit-amount",
          `The structured catalog value is ${formatAmount(amount)}.`,
          path,
          sourceUrl,
          "what_you_get",
        ),
      );
    }
  } else if (
    structure === "RANGE" &&
    evidence.benefit.min !== null &&
    evidence.benefit.max !== null
  ) {
    claims.push(
      claim(
        "benefit-amount",
        `The structured catalog range is ${formatAmount(evidence.benefit.min)} to ${formatAmount(evidence.benefit.max)}.`,
        "benefit.max",
        sourceUrl,
        "what_you_get",
      ),
    );
  } else if (structure === "UNKNOWN") {
    claims.push(
      claim(
        "benefit-unknown-guidance",
        evidence.boilerplate.unknown_amount_guidance,
        "boilerplate.unknown_amount_guidance",
        sourceUrl,
        "what_you_get",
      ),
    );
  } else if (!canUseBenefitSummary(evidence, summary)) {
    claims.push(
      claim(
        "benefit-type",
        `This is a ${benefitTypeLabel(evidence.benefit.type).toLowerCase()} program.`,
        "benefit.type",
        sourceUrl,
        "what_you_get",
      ),
    );
  }

  return claims;
}

function eligibilityClaims(
  evidence: EvidencePackage,
  sourceUrl: string | null,
): SourceClaim[] {
  const claims: SourceClaim[] = [
    claim(
      "qualify-intro",
      evidence.boilerplate.qualify_intro,
      "boilerplate.qualify_intro",
      sourceUrl,
      "who_may_qualify",
    ),
  ];

  evidence.eligibility.modeled_rules.forEach((rule, index) => {
    const explanation = rule.explanation?.trim();
    const line = explanation
      ? `- ${explanation}`
      : `- ${fieldLabel(rule.field)} ${rule.operator.replaceAll("_", " ")}`;
    claims.push(
      claim(
        `eligibility-rule-${index}`,
        line,
        `eligibility.modeled_rules.${index}.${explanation ? "explanation" : "field"}`,
        sourceUrl,
        "who_may_qualify",
      ),
    );
  });

  if (evidence.eligibility.modeled_rules.length === 0) {
    claims.push(
      claim(
        "eligibility-limited",
        `- ${evidence.boilerplate.eligibility_rules_limited}`,
        "boilerplate.eligibility_rules_limited",
        sourceUrl,
        "who_may_qualify",
      ),
    );
  }

  if (evidence.eligibility.unmodeled_required) {
    const extra =
      evidence.eligibility.unmodeled_summary?.trim() ||
      "Additional required eligibility is not fully modeled and is not treated as satisfied.";
    claims.push(
      claim(
        "eligibility-unmodeled",
        `Additional required criteria are not fully modeled and may also apply: ${extra}`,
        evidence.eligibility.unmodeled_summary
          ? "eligibility.unmodeled_summary"
          : "eligibility.unmodeled_required",
        sourceUrl,
        "who_may_qualify",
      ),
    );
  }

  return claims;
}

function howToApplyClaims(
  evidence: EvidencePackage,
  sourceUrl: string | null,
): SourceClaim[] {
  const claims: SourceClaim[] = [];
  const howToApply = evidence.application.how_to_apply?.trim();
  if (howToApply) {
    claims.push(
      claim(
        "how-to-apply",
        asSentence(howToApply),
        "application.how_to_apply",
        sourceUrl,
        "how_to_apply",
      ),
    );
  }

  if (evidence.application.purchase_before_approval_allowed === false) {
    claims.push(
      claim(
        "how-to-apply-before-action",
        sequencingCopy(sequencingActionFromEvidence(evidence)),
        "application.purchase_before_approval_allowed",
        sourceUrl,
        "how_to_apply",
      ),
    );
  }

  if (evidence.application.preapproval_required === true) {
    claims.push(
      claim(
        "how-to-apply-preapproval",
        "Preapproval is required.",
        "application.preapproval_required",
        sourceUrl,
        "how_to_apply",
      ),
    );
  }

  const cta = officialApplicationCta(evidence);
  if (cta) {
    const hrefPath = evidence.application.application_url
      ? "application.application_url"
      : evidence.application.official_url
        ? "application.official_url"
        : "official_sources.0.url";
    claims.push(
      claim(
        "how-to-apply-cta",
        asSentence(cta.label),
        hrefPath,
        sourceUrl,
        "how_to_apply",
      ),
    );
  } else {
    claims.push(
      claim(
        "how-to-apply-review",
        "Review the official program page before applying.",
        "application.official_url",
        sourceUrl,
        "how_to_apply",
      ),
    );
  }

  claims.push(
    claim(
      "how-to-apply-confirm",
      `Always confirm current steps with ${administratorName(evidence)}.`,
      administratorPath(evidence),
      sourceUrl,
      "how_to_apply",
    ),
  );
  return claims;
}

function documentClaims(
  evidence: EvidencePackage,
  sourceUrl: string | null,
): SourceClaim[] {
  const documents = evidence.application.documents?.trim();
  return [
    claim(
      "documents",
      documents || evidence.boilerplate.documents_unlisted,
      documents ? "application.documents" : "boilerplate.documents_unlisted",
      sourceUrl,
      "documents",
    ),
  ];
}

function importantNotesClaims(
  evidence: EvidencePackage,
  sourceUrl: string | null,
): SourceClaim[] {
  const claims: SourceClaim[] = [];
  evidence.warnings.forEach((warning, index) => {
    claims.push(
      claim(
        `warning-${index}`,
        warning,
        `warnings.${index}`,
        sourceUrl,
        "important_notes",
      ),
    );
  });

  const deadline = parseUtcCalendarDate(evidence.deadline.application_deadline);
  if (deadline && evidence.deadline.application_deadline) {
    claims.push(
      claim(
        "notes-deadline-date",
        `The structured application deadline is ${formatUtcCalendarDate(deadline)}.`,
        "deadline.application_deadline",
        sourceUrl,
        "important_notes",
      ),
    );
  } else {
    claims.push(
      claim(
        "notes-deadline-none",
        evidence.boilerplate.deadline_none,
        "boilerplate.deadline_none",
        sourceUrl,
        "important_notes",
      ),
      claim(
        "notes-deadline-check",
        evidence.boilerplate.check_official_dates,
        "boilerplate.check_official_dates",
        sourceUrl,
        "important_notes",
      ),
    );
  }

  claims.push(
    claim(
      "notes-not-exhaustive",
      evidence.boilerplate.not_exhaustive,
      "boilerplate.not_exhaustive",
      sourceUrl,
      "important_notes",
    ),
    claim(
      "notes-confirm",
      evidence.boilerplate.confirm_with_administrator,
      "boilerplate.confirm_with_administrator",
      sourceUrl,
      "important_notes",
    ),
  );
  if (evidence.eligibility.unmodeled_required) {
    claims.push(
      claim(
        "notes-unmodeled",
        "Some required eligibility is not fully modeled here and may also apply.",
        "eligibility.unmodeled_required",
        sourceUrl,
        "important_notes",
      ),
    );
  }
  return claims;
}

function faqClaims(
  evidence: EvidencePackage,
  sourceUrl: string | null,
  documentsText: string,
): SourceClaim[] {
  const applyCta = officialApplicationCta(evidence);
  const applyAnswer = applyCta
    ? asSentence(applyCta.label)
    : "Review the official program page before applying.";
  const claims: SourceClaim[] = [
    claim(
      "faq-q-qualify",
      evidence.boilerplate.faq_who_may_qualify,
      "boilerplate.faq_who_may_qualify",
      sourceUrl,
      "faqs",
    ),
    claim(
      "faq-a-qualify",
      "You may qualify if you meet the requirements on this page. This page cannot determine personal eligibility.",
      "boilerplate.cannot_determine_personal_eligibility",
      sourceUrl,
      "faqs",
    ),
    claim(
      "faq-q-apply",
      evidence.boilerplate.faq_how_to_apply,
      "boilerplate.faq_how_to_apply",
      sourceUrl,
      "faqs",
    ),
    claim(
      "faq-a-apply",
      applyAnswer,
      evidence.application.application_url
        ? "application.application_url"
        : "application.official_url",
      sourceUrl,
      "faqs",
    ),
    claim(
      "faq-q-documents",
      evidence.boilerplate.faq_documents,
      "boilerplate.faq_documents",
      sourceUrl,
      "faqs",
    ),
    claim(
      "faq-a-documents",
      documentsText,
      evidence.application.documents?.trim()
        ? "application.documents"
        : "boilerplate.documents_unlisted",
      sourceUrl,
      "faqs",
    ),
  ];

  const structure = evidence.benefit.amount_structure;
  if (!evidence.benefit.repayable) {
    claims.push(
      claim(
        "faq-q-amount",
        evidence.boilerplate.faq_how_much,
        "boilerplate.faq_how_much",
        sourceUrl,
        "faqs",
      ),
    );
    if (structure === "TIERED" && evidence.benefit.tiers.length > 0) {
      claims.push(
        claim(
          "faq-a-amount",
          `${evidence.boilerplate.tiered_amount_guidance}\n\n${evidence.benefit.tiers
            .map((tier) => formatTierEntry(tier))
            .join("\n\n")}`,
          "benefit.tiers",
          sourceUrl,
          "faqs",
        ),
      );
    } else if (
      structure === "SINGLE" &&
      evidence.benefit.amounts_are_structured_facts
    ) {
      const amount = evidence.benefit.min ?? evidence.benefit.max;
      const path = evidence.benefit.min !== null ? "benefit.min" : "benefit.max";
      claims.push(
        claim(
          "faq-a-amount",
          amount !== null
            ? `The structured catalog value is ${formatAmount(amount)}.`
            : evidence.boilerplate.unknown_amount_guidance,
          amount !== null ? path : "boilerplate.unknown_amount_guidance",
          sourceUrl,
          "faqs",
        ),
      );
    } else if (
      structure === "RANGE" &&
      evidence.benefit.min !== null &&
      evidence.benefit.max !== null
    ) {
      claims.push(
        claim(
          "faq-a-amount",
          `The structured catalog range is ${formatAmount(evidence.benefit.min)} to ${formatAmount(evidence.benefit.max)}.`,
          "benefit.max",
          sourceUrl,
          "faqs",
        ),
      );
    } else {
      claims.push(
        claim(
          "faq-a-amount",
          evidence.boilerplate.unknown_amount_guidance,
          "boilerplate.unknown_amount_guidance",
          sourceUrl,
          "faqs",
        ),
      );
    }
  }

  const deadline = parseUtcCalendarDate(evidence.deadline.application_deadline);
  if (deadline && evidence.deadline.application_deadline) {
    claims.push(
      claim(
        "faq-q-deadline",
        evidence.boilerplate.faq_deadline,
        "boilerplate.faq_deadline",
        sourceUrl,
        "faqs",
      ),
      claim(
        "faq-a-deadline",
        `The structured application deadline is ${formatUtcCalendarDate(deadline)}.`,
        "deadline.application_deadline",
        sourceUrl,
        "faqs",
      ),
    );
  }

  claims.push(
    claim(
      "faq-q-only",
      evidence.boilerplate.faq_only_consider,
      "boilerplate.faq_only_consider",
      sourceUrl,
      "faqs",
    ),
    claim(
      "faq-a-only",
      "No. This catalog is not exhaustive. Other local, state, or federal programs may also exist.",
      "boilerplate.not_exhaustive",
      sourceUrl,
      "faqs",
    ),
  );

  if (structure === "TIERED") {
    evidence.benefit.tiers.forEach((tier, index) => {
      claims.push(
        claim(
          `faq-q-tier-${index}`,
          `What award applies for ${tier.label}?`,
          `benefit.tiers.${index}.label`,
          sourceUrl,
          "faqs",
        ),
        claim(
          `faq-a-tier-${index}`,
          formatTierEntry(tier),
          `benefit.tiers.${index}.condition_summary`,
          sourceUrl,
          "faqs",
        ),
      );
    });
  }

  return claims;
}

export function buildFactualClaims(evidence: EvidencePackage): SourceClaim[] {
  const sourceUrl = officialSourceUrl(evidence);
  const documents = documentClaims(evidence, sourceUrl);
  const claims: SourceClaim[] = [
    ...titleClaims(evidence, sourceUrl),
    claim(
      "dek-status",
      `${evidence.official_name} is listed as ${evidence.status}.`,
      "status",
      sourceUrl,
      "dek",
    ),
    claim(
      "dek-limit",
      evidence.boilerplate.cannot_determine_personal_eligibility,
      "boilerplate.cannot_determine_personal_eligibility",
      sourceUrl,
      "dek",
    ),
    ...overviewClaims(evidence, sourceUrl),
    ...whatYouGetClaims(evidence, sourceUrl),
    ...eligibilityClaims(evidence, sourceUrl),
    ...howToApplyClaims(evidence, sourceUrl),
    ...documents,
    ...importantNotesClaims(evidence, sourceUrl),
    ...faqClaims(evidence, sourceUrl, documents[0]?.text ?? ""),
  ];

  return claims.filter((item) => item.text.trim().length > 0);
}

export function renderDraftFromClaims(
  claims: SourceClaim[],
  evidence: EvidencePackage,
  opportunity: ScoredOpportunity,
): ContentDraft {
  return {
    seo_title: renderFactualSection(claims, "seo_title"),
    meta_description: renderFactualSection(claims, "meta_description"),
    h1: renderFactualSection(claims, "h1"),
    dek: renderFactualSection(claims, "dek"),
    overview: renderFactualSection(claims, "overview"),
    what_you_get: renderFactualSection(claims, "what_you_get"),
    who_may_qualify: renderFactualSection(claims, "who_may_qualify"),
    how_to_apply: renderFactualSection(claims, "how_to_apply"),
    documents: renderFactualSection(claims, "documents"),
    important_notes: renderFactualSection(claims, "important_notes"),
    faqs: renderFaqs(claims),
    suggested_internal_links: [
      {
        href: `/programs/${opportunity.proposed_slug}`,
        label: evidence.official_name,
        required: true,
      },
      {
        href: "/programs",
        label: "Browse programs",
        required: true,
      },
      {
        href: "/check",
        label: "Check what you may qualify for",
        required: false,
      },
    ],
    suggested_official_cta: officialApplicationCta(evidence),
    source_claims: claims,
  };
}

export function buildDeterministicDraft(
  evidence: EvidencePackage,
  opportunity: ScoredOpportunity,
): ContentDraft {
  return renderDraftFromClaims(
    selectDefaultClaims(buildFactualClaims(evidence)),
    evidence,
    opportunity,
  );
}
