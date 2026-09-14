import { benefitTypeLabel, fieldLabel } from "@/lib/programs/labels";
import {
  formatUtcCalendarDate,
  parseUtcCalendarDate,
} from "@/lib/programs/calendar";
import {
  renderFaqAnswers,
  renderFactualSection,
} from "@/lib/content-pipeline/claims";
import type {
  ContentDraft,
  ContentDraftProvider,
  EvidencePackage,
  FactualDraftSection,
  ScoredOpportunity,
  SourceClaim,
} from "@/lib/content-pipeline/types";

export class FakeContentDraftProvider implements ContentDraftProvider {
  readonly id = "fake";

  async generateDraft(input: {
    evidence: EvidencePackage;
    opportunity: ScoredOpportunity;
  }): Promise<ContentDraft> {
    return buildDeterministicDraft(input.evidence, input.opportunity);
  }
}

export function createContentDraftProvider(
  providerId = "fake",
): ContentDraftProvider {
  if (providerId === "fake" || providerId === "") {
    return new FakeContentDraftProvider();
  }
  throw new Error(
    `Draft provider "${providerId}" is not implemented. Use the fake provider for this dry-run milestone.`,
  );
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

function formatAmount(value: number): string {
  return `$${value.toLocaleString("en-US")}`;
}

function benefitClaims(
  evidence: EvidencePackage,
  sourceUrl: string | null,
  section: FactualDraftSection,
  idPrefix: string,
): SourceClaim[] {
  const claims: SourceClaim[] = [];
  if (evidence.benefit.repayable) {
    claims.push(
      claim(
        `${idPrefix}repayable`,
        `${evidence.official_name} is ${benefitTypeLabel(evidence.benefit.type).toLowerCase()}, which must be repaid. Treat it as financing, not a grant or cash award.`,
        "benefit.repayable",
        sourceUrl,
        section,
      ),
    );
    return claims;
  }

  if (evidence.benefit.summary?.trim()) {
    claims.push(
      claim(
        `${idPrefix}summary`,
        evidence.benefit.summary.trim(),
        "benefit.summary",
        sourceUrl,
        section,
      ),
    );
  } else {
    claims.push(
      claim(
        `${idPrefix}type`,
        `This is a ${benefitTypeLabel(evidence.benefit.type).toLowerCase()} program.`,
        "benefit.type",
        sourceUrl,
        section,
      ),
    );
  }

  if (evidence.benefit.amounts_are_structured_facts) {
    let text = "";
    let path = "benefit.max";
    if (evidence.benefit.min !== null && evidence.benefit.max !== null) {
      path = "benefit.max";
      text =
        evidence.benefit.min === evidence.benefit.max
          ? `The structured catalog value is ${formatAmount(evidence.benefit.min)}.`
          : `The structured catalog range is ${formatAmount(evidence.benefit.min)} to ${formatAmount(evidence.benefit.max)}.`;
    } else if (evidence.benefit.max !== null) {
      text = `The structured catalog maximum is ${formatAmount(evidence.benefit.max)}.`;
    } else if (evidence.benefit.min !== null) {
      path = "benefit.min";
      text = `The structured catalog minimum is ${formatAmount(evidence.benefit.min)}.`;
    }
    if (text) {
      claims.push(claim(`${idPrefix}amount`, text, path, sourceUrl, section));
    }
  }

  return claims;
}

function deadlineClaims(
  evidence: EvidencePackage,
  sourceUrl: string | null,
  section: FactualDraftSection,
  idPrefix: string,
): SourceClaim[] {
  const deadline = parseUtcCalendarDate(evidence.deadline.application_deadline);
  if (!deadline || !evidence.deadline.application_deadline) {
    return [
      claim(
        `${idPrefix}none`,
        evidence.boilerplate.deadline_none,
        "boilerplate.deadline_none",
        sourceUrl,
        section,
      ),
      claim(
        `${idPrefix}check`,
        evidence.boilerplate.check_official_dates,
        "boilerplate.check_official_dates",
        sourceUrl,
        section,
      ),
    ];
  }
  return [
    claim(
      `${idPrefix}date`,
      `The structured application deadline is ${formatUtcCalendarDate(deadline)}.`,
      "deadline.application_deadline",
      sourceUrl,
      section,
    ),
  ];
}

function geographyClaim(
  evidence: EvidencePackage,
  sourceUrl: string | null,
  section: FactualDraftSection,
): SourceClaim {
  if (evidence.geography.statewide) {
    return claim(
      `${section}-geography`,
      "The structured geography is statewide in California.",
      "geography.statewide",
      sourceUrl,
      section,
    );
  }
  const text = `The structured geography includes ${
    evidence.geography.locations
      .map((location) => `${location.value} (${location.type.toLowerCase()})`)
      .join(", ") || "a limited service area"
  }.`;
  return claim(
    `${section}-geography`,
    text,
    evidence.geography.locations[0] ? "geography.locations.0.value" : "geography.statewide",
    sourceUrl,
    section,
  );
}

export function buildFactualClaims(evidence: EvidencePackage): SourceClaim[] {
  const sourceUrl = evidence.official_sources[0]?.url ?? null;
  const administrator = evidence.administrator ?? "the program administrator";
  const applyUrl = evidence.application.application_url ?? evidence.application.official_url;
  const claims: SourceClaim[] = [];

  claims.push(
    claim(
      "seo-title-name",
      evidence.official_name,
      "official_name",
      sourceUrl,
      "seo_title",
    ),
    claim(
      "seo-title-suffix",
      evidence.boilerplate.seo_title_suffix,
      "boilerplate.seo_title_suffix",
      sourceUrl,
      "seo_title",
    ),
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

  const headline = evidence.consumer_headline?.trim();
  if (headline) {
    claims.push(
      claim("h1-headline", headline, "consumer_headline", sourceUrl, "h1"),
      claim(
        "h1-suffix",
        evidence.boilerplate.h1_qualify_suffix,
        "boilerplate.h1_qualify_suffix",
        sourceUrl,
        "h1",
      ),
    );
  } else {
    claims.push(
      claim("h1-name", evidence.official_name, "official_name", sourceUrl, "h1"),
      claim(
        "h1-suffix",
        evidence.boilerplate.seo_title_suffix,
        "boilerplate.seo_title_suffix",
        sourceUrl,
        "h1",
      ),
    );
  }

  claims.push(
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
    claim(
      "overview-admin",
      `${evidence.official_name} is administered by ${administrator}.`,
      "administrator",
      sourceUrl,
      "overview",
    ),
    claim(
      "overview-status",
      `Structured status: ${evidence.status}.`,
      "status",
      sourceUrl,
      "overview",
    ),
    geographyClaim(evidence, sourceUrl, "overview"),
    ...benefitClaims(evidence, sourceUrl, "overview", "overview-benefit-"),
    ...deadlineClaims(evidence, sourceUrl, "overview", "overview-deadline-"),
    claim(
      "overview-source",
      sourceUrl ? `Official source: ${sourceUrl}.` : "Official source is listed in the evidence package.",
      "official_sources.0.url",
      sourceUrl,
      "overview",
    ),
    claim(
      "overview-not-exhaustive",
      evidence.boilerplate.not_exhaustive,
      "boilerplate.not_exhaustive",
      sourceUrl,
      "overview",
    ),
    ...benefitClaims(evidence, sourceUrl, "what_you_get", "benefit-"),
    claim(
      "qualify-intro",
      "Households may qualify when they meet the modeled rules below.",
      "official_name",
      sourceUrl,
      "who_may_qualify",
    ),
    claim(
      "qualify-limit",
      evidence.boilerplate.cannot_determine_personal_eligibility,
      "boilerplate.cannot_determine_personal_eligibility",
      sourceUrl,
      "who_may_qualify",
    ),
  );

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

  const howToApply = evidence.application.how_to_apply?.trim()
    ? evidence.application.how_to_apply.trim()
    : applyUrl
      ? `Review the official instructions and apply through ${applyUrl}.`
      : "Review the official program page before applying.";
  claims.push(
    claim(
      "how-to-apply",
      howToApply,
      evidence.application.how_to_apply?.trim()
        ? "application.how_to_apply"
        : applyUrl
          ? "application.application_url"
          : "application.official_url",
      sourceUrl,
      "how_to_apply",
    ),
    claim(
      "how-to-apply-confirm",
      `Always confirm current steps with ${administrator}.`,
      "administrator",
      sourceUrl,
      "how_to_apply",
    ),
    claim(
      "documents",
      evidence.application.documents?.trim() || evidence.boilerplate.documents_unlisted,
      evidence.application.documents?.trim()
        ? "application.documents"
        : "boilerplate.documents_unlisted",
      sourceUrl,
      "documents",
    ),
  );

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

  const qualifyText = renderFactualSection(claims, "who_may_qualify");
  const applyText = renderFactualSection(claims, "how_to_apply");
  claims.push(
    claim(
      "faq-qualify",
      qualifyText,
      "official_name",
      sourceUrl,
      "faqs",
    ),
    claim(
      "faq-apply",
      applyText,
      "application.official_url",
      sourceUrl,
      "faqs",
    ),
    claim(
      "faq-exhaustive",
      "No. This catalog is not exhaustive. Other local, state, or federal programs may also exist.",
      "boilerplate.not_exhaustive",
      sourceUrl,
      "faqs",
    ),
  );

  return claims.filter((item) => item.text.trim().length > 0);
}

export function renderDraftFromClaims(
  claims: SourceClaim[],
  evidence: EvidencePackage,
  opportunity: ScoredOpportunity,
): ContentDraft {
  const faqAnswers = renderFaqAnswers(claims);
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
    faqs: [
      {
        question: `Who may qualify for ${evidence.official_name}?`,
        answer: faqAnswers[0] ?? "",
      },
      {
        question: "How do I apply?",
        answer: faqAnswers[1] ?? "",
      },
      {
        question: "Is this the only California benefit I should consider?",
        answer: faqAnswers[2] ?? evidence.boilerplate.not_exhaustive,
      },
    ],
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
    source_claims: claims,
  };
}

export function buildDeterministicDraft(
  evidence: EvidencePackage,
  opportunity: ScoredOpportunity,
): ContentDraft {
  return renderDraftFromClaims(buildFactualClaims(evidence), evidence, opportunity);
}
