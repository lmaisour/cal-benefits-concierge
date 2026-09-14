import { benefitTypeLabel, fieldLabel } from "@/lib/programs/labels";
import {
  formatUtcCalendarDate,
  parseUtcCalendarDate,
} from "@/lib/programs/calendar";
import type {
  ContentDraft,
  ContentDraftProvider,
  EvidencePackage,
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

function moneyPhrase(evidence: EvidencePackage): { text: string; claims: SourceClaim[] } {
  const claims: SourceClaim[] = [];
  if (evidence.benefit.repayable) {
    const text = `${evidence.official_name} is ${benefitTypeLabel(evidence.benefit.type).toLowerCase()}, which must be repaid. Treat it as financing, not a grant or cash award.`;
    claims.push({
      claim_id: "benefit-repayable",
      text,
      evidence_path: "benefit.repayable",
      source_url: evidence.official_sources[0]?.url ?? null,
    });
    return { text, claims };
  }

  const parts: string[] = [];
  if (evidence.benefit.summary?.trim()) {
    parts.push(evidence.benefit.summary.trim());
    claims.push({
      claim_id: "benefit-summary",
      text: evidence.benefit.summary.trim(),
      evidence_path: "benefit.summary",
      source_url: evidence.official_sources[0]?.url ?? null,
    });
  } else {
    parts.push(
      `This is a ${benefitTypeLabel(evidence.benefit.type).toLowerCase()} program. Confirm the current benefit on the official page.`,
    );
    claims.push({
      claim_id: "benefit-type",
      text: benefitTypeLabel(evidence.benefit.type),
      evidence_path: "benefit.type",
      source_url: evidence.official_sources[0]?.url ?? null,
    });
  }

  if (evidence.benefit.amounts_are_structured_facts) {
    const formatAmount = (value: number) => `$${value.toLocaleString("en-US")}`;
    if (evidence.benefit.min !== null && evidence.benefit.max !== null) {
      if (evidence.benefit.min === evidence.benefit.max) {
        parts.push(`The structured catalog value is ${formatAmount(evidence.benefit.min)}.`);
      } else {
        parts.push(
          `The structured catalog range is ${formatAmount(evidence.benefit.min)} to ${formatAmount(evidence.benefit.max)}.`,
        );
      }
    } else if (evidence.benefit.max !== null) {
      parts.push(`The structured catalog maximum is ${formatAmount(evidence.benefit.max)}.`);
    } else if (evidence.benefit.min !== null) {
      parts.push(`The structured catalog minimum is ${formatAmount(evidence.benefit.min)}.`);
    }
    claims.push({
      claim_id: "benefit-amount",
      text:
        evidence.benefit.max !== null
          ? formatAmount(evidence.benefit.max)
          : formatAmount(evidence.benefit.min ?? 0),
      evidence_path:
        evidence.benefit.max !== null ? "benefit.max" : "benefit.min",
      source_url: evidence.official_sources[0]?.url ?? null,
    });
  }

  return { text: parts.join(" "), claims };
}

function deadlinePhrase(evidence: EvidencePackage): { text: string; claims: SourceClaim[] } {
  const deadline = parseUtcCalendarDate(evidence.deadline.application_deadline);
  if (!deadline || !evidence.deadline.application_deadline) {
    return {
      text: "No structured application deadline is recorded. Check the official source for current dates.",
      claims: [
        {
          claim_id: "deadline-none",
          text: "No structured application deadline is recorded.",
          evidence_path: "deadline.application_deadline",
          source_url: evidence.official_sources[0]?.url ?? null,
        },
      ],
    };
  }
  const label = formatUtcCalendarDate(deadline);
  const text = `The structured application deadline is ${label}.`;
  return {
    text,
    claims: [
      {
        claim_id: "deadline",
        text: label,
        evidence_path: "deadline.application_deadline",
        source_url: evidence.official_sources[0]?.url ?? null,
      },
    ],
  };
}

function eligibilityPhrase(evidence: EvidencePackage): { text: string; claims: SourceClaim[] } {
  const claims: SourceClaim[] = [];
  const lines = [
    "Households may qualify when they meet the modeled rules below. This page cannot determine personal eligibility.",
  ];

  evidence.eligibility.modeled_rules.forEach((rule, index) => {
    const explanation = rule.explanation?.trim();
    const line = explanation
      ? explanation
      : `${fieldLabel(rule.field)} ${rule.operator.replaceAll("_", " ")}`;
    lines.push(`- ${line}`);
    claims.push({
      claim_id: `eligibility-rule-${index}`,
      text: line,
      evidence_path: `eligibility.modeled_rules.${index}.${explanation ? "explanation" : "field"}`,
      source_url: evidence.official_sources[0]?.url ?? null,
    });
  });

  if (evidence.eligibility.modeled_rules.length === 0) {
    lines.push(
      "- Modeled eligibility rules are limited. Confirm requirements on the official source.",
    );
  }

  if (evidence.eligibility.unmodeled_required) {
    const extra =
      evidence.eligibility.unmodeled_summary?.trim() ||
      "Additional required eligibility is not fully modeled and is not treated as satisfied.";
    lines.push(
      `Additional required criteria are not fully modeled and may also apply: ${extra}`,
    );
    claims.push({
      claim_id: "eligibility-unmodeled",
      text: extra,
      evidence_path: "eligibility.unmodeled_summary",
      source_url: evidence.official_sources[0]?.url ?? null,
    });
  }

  claims.push({
    claim_id: "eligibility-may",
    text: "Households may qualify when they meet the modeled rules below.",
    evidence_path: "official_name",
    source_url: evidence.official_sources[0]?.url ?? null,
  });

  return { text: lines.join("\n"), claims };
}

function geographyPhrase(evidence: EvidencePackage): { text: string; claim: SourceClaim } {
  const text = evidence.geography.statewide
    ? "The structured geography is statewide in California."
    : `The structured geography includes ${
        evidence.geography.locations
          .map((location) => `${location.value} (${location.type.toLowerCase()})`)
          .join(", ") || "a limited service area"
      }.`;
  return {
    text,
    claim: {
      claim_id: "geography",
      text,
      evidence_path: evidence.geography.statewide
        ? "geography.statewide"
        : "geography.locations.0.value",
      source_url: evidence.official_sources[0]?.url ?? null,
    },
  };
}

export function buildDeterministicDraft(
  evidence: EvidencePackage,
  opportunity: ScoredOpportunity,
): ContentDraft {
  const benefit = moneyPhrase(evidence);
  const deadline = deadlinePhrase(evidence);
  const eligibility = eligibilityPhrase(evidence);
  const geography = geographyPhrase(evidence);
  const sourceUrl = evidence.official_sources[0]?.url ?? "";
  const administrator = evidence.administrator ?? "the program administrator";
  const applyUrl = evidence.application.application_url ?? evidence.application.official_url;

  const seo_title = `${evidence.official_name}: who may qualify and how to apply`;
  const h1 = evidence.consumer_headline?.trim()
    ? `${evidence.consumer_headline.trim()} — who may qualify`
    : seo_title;
  const dek = `${evidence.official_name} is listed as ${evidence.status}. Households may qualify; this catalog cannot determine personal eligibility.`;
  const overview = [
    `${evidence.official_name} is administered by ${administrator}.`,
    `Structured status: ${evidence.status}.`,
    geography.text,
    benefit.text,
    deadline.text,
    `Official source: ${sourceUrl}. This is not an exhaustive list of California benefits.`,
  ].join(" ");

  const how_to_apply = evidence.application.how_to_apply?.trim()
    ? evidence.application.how_to_apply.trim()
    : applyUrl
      ? `Review the official instructions and apply through ${applyUrl}. Always confirm current steps with ${administrator}.`
      : `Review the official program page before applying. Always confirm current steps with ${administrator}.`;

  const documents =
    evidence.application.documents?.trim() ||
    "Required documents are not fully listed in the structured catalog. Use the official application checklist.";

  const important_notes = [
    ...evidence.warnings,
    "This catalog is not exhaustive.",
    "Always confirm eligibility, funding, and deadlines with the official administrator.",
    evidence.eligibility.unmodeled_required
      ? "Some required eligibility is not fully modeled here and may also apply."
      : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n\n");

  const faqs = [
    {
      question: `Who may qualify for ${evidence.official_name}?`,
      answer: eligibility.text,
    },
    {
      question: "How do I apply?",
      answer: how_to_apply,
    },
    {
      question: "Is this the only California benefit I should consider?",
      answer:
        "No. This catalog is not exhaustive. Other local, state, or federal programs may also exist.",
    },
  ];

  const source_claims: SourceClaim[] = [
    {
      claim_id: "official-name",
      text: evidence.official_name,
      evidence_path: "official_name",
      source_url: sourceUrl || null,
    },
    {
      claim_id: "status",
      text: evidence.status,
      evidence_path: "status",
      source_url: sourceUrl || null,
    },
    {
      claim_id: "administrator",
      text: administrator,
      evidence_path: "administrator",
      source_url: sourceUrl || null,
    },
    geography.claim,
    ...benefit.claims,
    ...deadline.claims,
    ...eligibility.claims,
    {
      claim_id: "official-source",
      text: sourceUrl,
      evidence_path: "official_sources.0.url",
      source_url: sourceUrl || null,
    },
  ].filter((claim) => claim.text && claim.text.length > 0);

  return {
    seo_title,
    meta_description: `${evidence.official_name} may help qualifying households. See who may qualify, what you may receive, and how to apply. Confirm details on the official source.`,
    h1,
    dek,
    overview,
    what_you_get: benefit.text,
    who_may_qualify: eligibility.text,
    how_to_apply,
    documents,
    important_notes,
    faqs,
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
    source_claims,
  };
}
