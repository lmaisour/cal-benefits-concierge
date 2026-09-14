import { isHttpUrl } from "@/lib/admin/validate-program";
import {
  formatUtcCalendarDate,
  parseUtcCalendarDate,
} from "@/lib/programs/calendar";
import {
  extractSynthesizedRanges,
  looksLikeDefiniteSynthesizedAmount,
  looksLikeSynthesizedRange,
} from "@/lib/content-pipeline/amount-structure";
import { factualSectionMatchesClaims } from "@/lib/content-pipeline/claims";
import {
  FACTUAL_DRAFT_SECTIONS,
  type ContentDraft,
  type DuplicateIndex,
  type EvidencePackage,
  type ValidationIssue,
  type ValidationIssueCode,
  type ValidationResult,
  type ValidationWarning,
} from "@/lib/content-pipeline/types";

export type ValidateDraftInput = {
  draft: ContentDraft;
  evidence: EvidencePackage;
  known_routes: string[];
  duplicates?: DuplicateIndex;
  own_slug?: string;
  own_titles?: string[];
};

const QUALIFY_DEFINITE =
  /\b(you qualify|you are eligible|you're eligible|you will qualify|guaranteed to qualify|automatically qualify|you are approved)\b/i;

const TITLE_OVERCLAIM =
  /\b(you qualify|everyone qualifies|all residents qualify|guaranteed|automatically eligible|you are eligible)\b/i;

const EXHAUSTIVE =
  /\b(all california (benefits|programs)|every (california )?(benefit|program)|complete list of( all)?|exhaustive catalog|only programs you need|every program available)\b/i;

const LOAN_AS_SAVINGS =
  /\b(free money|free cash|free savings|save you|saves you|you'll save|you save|not a loan|gift(?:\s+not a loan)?)\b/i;

const ACTIVE_LANGUAGE =
  /\b(now (?:open|available|accepting)|currently (?:open|available|active)|is active|accepting applications)\b/i;

const UNMODELED_MENTION =
  /\b(unmodeled|additional required|not fully modeled|may also apply|cannot (?:fully )?determine|other requirement|extra (?:requirement|criter)|confirm (?:eligibility|requirements) with)\b/i;

const LOW_CONFIDENCE_DEFINITE =
  /\b(is eligible|will receive|definitely qualifies|you will get)\b/i;

const ELIGIBILITY_HINTS: { pattern: RegExp; fields: string[]; label: string }[] = [
  { pattern: /\bveterans?\b/i, fields: ["veteran"], label: "veteran" },
  { pattern: /\bdisabilit/i, fields: ["disability"], label: "disability" },
  {
    pattern: /\b(?:household )?income\b/i,
    fields: ["household_income"],
    label: "income",
  },
  {
    pattern: /\bhousehold size\b/i,
    fields: ["household_size"],
    label: "household size",
  },
  { pattern: /\bhomeowners?\b/i, fields: ["homeowner", "owned_home"], label: "homeowner" },
  {
    pattern: /\brenters?\b/i,
    fields: ["housing_status", "homeowner"],
    label: "renter",
  },
];

function issue(
  code: ValidationIssueCode,
  message: string,
  evidence_path?: string,
): ValidationIssue {
  return { passed: false, code, message, evidence_path };
}

function draftText(draft: ContentDraft): string {
  return [
    draft.seo_title,
    draft.meta_description,
    draft.h1,
    draft.dek,
    draft.overview,
    draft.what_you_get,
    draft.who_may_qualify,
    draft.how_to_apply,
    draft.documents,
    draft.important_notes,
    ...draft.faqs.flatMap((faq) => [faq.question, faq.answer]),
  ].join("\n");
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function pathExists(value: unknown, path: string): boolean {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let current: unknown = value;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return false;
    }
    if (!(part in (current as object))) {
      return false;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return true;
}

function walkValues(value: unknown, visit: (item: string | number) => void): void {
  if (typeof value === "string" || typeof value === "number") {
    visit(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      walkValues(item, visit);
    }
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      walkValues(item, visit);
    }
  }
}

function extractAmounts(text: string): string[] {
  const found = new Set<string>();
  const pattern = /\$\s*([\d,]+(?:\.\d+)?)/g;
  for (const match of text.matchAll(pattern)) {
    const normalized = match[1].replace(/,/g, "");
    if (normalized) {
      found.add(normalized);
    }
  }
  return [...found];
}

function extractEvidenceAmounts(
  evidence: EvidencePackage,
  options: { excludeMinMax?: boolean } = {},
): Set<string> {
  const amounts = new Set<string>();
  if (!options.excludeMinMax) {
    if (evidence.benefit.min !== null) {
      amounts.add(String(evidence.benefit.min));
    }
    if (evidence.benefit.max !== null) {
      amounts.add(String(evidence.benefit.max));
    }
  }
  const skip = new Set<unknown>(
    options.excludeMinMax
      ? [evidence.benefit.min, evidence.benefit.max]
      : [],
  );
  walkValues(evidence, (item) => {
    if (skip.has(item)) {
      return;
    }
    if (typeof item === "number" && Number.isFinite(item)) {
      amounts.add(String(Math.round(item)));
    }
    if (typeof item === "string") {
      for (const amount of extractAmounts(item)) {
        amounts.add(amount);
      }
    }
  });
  return amounts;
}

function extractAllowedDraftAmounts(evidence: EvidencePackage): Set<string> {
  if (evidence.benefit.amount_structure === "TIERED") {
    const amounts = new Set<string>();
    for (const tier of evidence.benefit.tiers) {
      if (tier.amount !== null) {
        amounts.add(String(tier.amount));
      }
      for (const amount of extractAmounts(`${tier.label} ${tier.condition_summary}`)) {
        amounts.add(amount);
      }
    }
    return amounts;
  }
  if (evidence.benefit.amount_structure === "UNKNOWN") {
    return extractEvidenceAmounts(evidence, { excludeMinMax: true });
  }
  return extractEvidenceAmounts(evidence);
}

function extractDates(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)) {
    found.add(match[1]);
  }
  for (const match of text.matchAll(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/g,
  )) {
    const parsed = Date.parse(`${match[0]} UTC`);
    if (!Number.isNaN(parsed)) {
      const date = new Date(parsed);
      const iso = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
      found.add(iso);
    }
  }
  return [...found];
}

function evidenceDates(evidence: EvidencePackage): Set<string> {
  const dates = new Set<string>();
  const structured = [
    evidence.deadline.application_deadline,
    evidence.deadline.effective_end,
    evidence.verified_at,
    evidence.freshness.last_verified_at,
  ];
  for (const value of structured) {
    const parsed = parseUtcCalendarDate(value);
    if (parsed) {
      dates.add(
        `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-${String(parsed.getUTCDate()).padStart(2, "0")}`,
      );
      dates.add(formatUtcCalendarDate(parsed));
    }
  }
  walkValues(evidence, (item) => {
    if (typeof item === "string") {
      for (const date of extractDates(item)) {
        dates.add(date);
      }
    }
  });
  return dates;
}

function routeExists(href: string, knownRoutes: string[]): boolean {
  try {
    const url = href.startsWith("http://") || href.startsWith("https://")
      ? new URL(href)
      : new URL(href, "https://benefitsconcierge.org");
    if (url.origin !== "https://benefitsconcierge.org") {
      return false;
    }
    const path = url.pathname.replace(/\/+$/, "") || "/";
    return knownRoutes.some((route) => (route.replace(/\/+$/, "") || "/") === path);
  } catch {
    return false;
  }
}

function eligibilityCorpus(evidence: EvidencePackage): string {
  return [
    ...evidence.eligibility.modeled_rules.map((rule) =>
      [rule.field, rule.explanation ?? "", JSON.stringify(rule.value)].join(" "),
    ),
    evidence.eligibility.unmodeled_summary ?? "",
    evidence.benefit.summary ?? "",
    evidence.official_name,
  ].join("\n");
}

export function validateDraft(input: ValidateDraftInput): ValidationResult {
  const { draft, evidence } = input;
  const errors: ValidationIssue[] = [];
  const warnings: ValidationWarning[] = [];
  const text = draftText(draft);
  const titleText = `${draft.seo_title}\n${draft.h1}`;

  if (evidence.official_sources.length === 0) {
    errors.push(
      issue("NO_OFFICIAL_SOURCE", "Evidence package has no official http(s) source."),
    );
  }

  if (evidence.status !== "ACTIVE" || evidence.active === false) {
    errors.push(
      issue(
        "PROGRAM_NOT_ACTIVE",
        `Program status is ${evidence.status} (active=${evidence.active}).`,
        "status",
      ),
    );
  }

  if (evidence.confidence === "LOW" && LOW_CONFIDENCE_DEFINITE.test(text)) {
    errors.push(
      issue(
        "LOW_CONFIDENCE_DEFINITE",
        "LOW-confidence facts are stated as definite without qualification.",
        "confidence",
      ),
    );
  }

  const allowedAmounts = extractAllowedDraftAmounts(evidence);
  for (const amount of extractAmounts(text)) {
    if (!allowedAmounts.has(amount)) {
      const tiered = evidence.benefit.amount_structure === "TIERED";
      errors.push(
        issue(
          tiered ? "UNSUPPORTED_TIER_AMOUNT" : "UNSUPPORTED_AMOUNT",
          `Draft includes unsupported dollar amount $${amount}.`,
          tiered ? "benefit.tiers" : "benefit",
        ),
      );
    }
  }

  if (
    evidence.benefit.amount_structure === "TIERED" &&
    looksLikeSynthesizedRange(text)
  ) {
    errors.push(
      issue(
        "TIERED_BENEFIT_FLATTENED",
        `Tiered benefit is rendered as a synthesized range (${extractSynthesizedRanges(text).join(", ")}). Describe each modeled tier and its condition instead.`,
        "benefit.amount_structure",
      ),
    );
  }

  if (
    evidence.benefit.amount_structure === "UNKNOWN" &&
    (looksLikeSynthesizedRange(text) || looksLikeDefiniteSynthesizedAmount(text))
  ) {
    errors.push(
      issue(
        "UNKNOWN_AMOUNT_RANGE",
        "Unknown amount structure cannot be presented as a definite synthesized amount or range.",
        "benefit.amount_structure",
      ),
    );
  }

  const allowedDates = evidenceDates(evidence);
  const deadlineMentions = /\b(deadline|due by|apply by|applications? (?:close|are due))\b/i.test(
    text,
  );
  for (const date of extractDates(text)) {
    const allowed =
      allowedDates.has(date) ||
      [...allowedDates].some((value) => normalize(value) === normalize(date));
    if (!allowed && deadlineMentions) {
      errors.push(
        issue(
          "UNSUPPORTED_DEADLINE",
          `Draft includes unsupported deadline date ${date}.`,
          "deadline.application_deadline",
        ),
      );
    }
  }
  if (
    deadlineMentions &&
    !evidence.deadline.application_deadline &&
    !evidence.deadline.effective_end &&
    !/\bno structured application deadline\b/i.test(text)
  ) {
    errors.push(
      issue(
        "UNSUPPORTED_DEADLINE",
        "Draft discusses a deadline but evidence has no structured deadline.",
        "deadline.application_deadline",
      ),
    );
  }

  const modeledFields = new Set(
    evidence.eligibility.modeled_rules.map((rule) => rule.field),
  );
  const eligibilityText = `${draft.who_may_qualify}\n${draft.overview}\n${draft.faqs.map((faq) => `${faq.question}\n${faq.answer}`).join("\n")}`;
  const corpus = eligibilityCorpus(evidence);
  const tierCorpus = evidence.benefit.tiers
    .map((tier) => `${tier.label} ${tier.condition_summary}`)
    .join("\n");
  for (const hint of ELIGIBILITY_HINTS) {
    if (!hint.pattern.test(eligibilityText) && !hint.pattern.test(text)) {
      continue;
    }
    const modeled = hint.fields.some((field) => modeledFields.has(field));
    const inEvidence = hint.pattern.test(corpus);
    const inTiers = hint.pattern.test(tierCorpus);
    if (!modeled && !inEvidence && !inTiers) {
      if (evidence.benefit.amount_structure === "TIERED" && hint.pattern.test(text)) {
        errors.push(
          issue(
            "UNSUPPORTED_TIER_CONDITION",
            `Draft states a tier condition about ${hint.label} that is not in modeled tiers.`,
            "benefit.tiers",
          ),
        );
      }
      if (hint.pattern.test(eligibilityText)) {
        errors.push(
          issue(
            "UNSUPPORTED_ELIGIBILITY",
            `Draft makes an eligibility claim about ${hint.label} that is not in structured rules or unmodeled summary.`,
            "eligibility.modeled_rules",
          ),
        );
      }
    }
  }

  if (
    evidence.status !== "ACTIVE" &&
    ACTIVE_LANGUAGE.test(text) &&
    !/\b(paused|expired|waitlist|funding exhausted|uncertain)\b/i.test(text)
  ) {
    errors.push(
      issue(
        "INACTIVE_PRESENTED_AS_ACTIVE",
        "Non-active program is presented as currently open or active.",
        "status",
      ),
    );
  }

  if (evidence.benefit.repayable && LOAN_AS_SAVINGS.test(text)) {
    errors.push(
      issue(
        "LOAN_FRAMED_AS_SAVINGS",
        "Loan or financing is framed as free savings.",
        "benefit.repayable",
      ),
    );
  }

  const exhaustiveSentence = text.split(/(?<=[.!?])\s+/).find((sentence) => {
    return EXHAUSTIVE.test(sentence) && !/\bnot\b.+\b(exhaustive|every|all|complete)\b/i.test(sentence);
  });
  if (exhaustiveSentence) {
    errors.push(
      issue(
        "EXHAUSTIVE_CATALOG_CLAIM",
        "Draft implies the Benefits Concierge catalog is exhaustive.",
      ),
    );
  }

  if (TITLE_OVERCLAIM.test(titleText)) {
    errors.push(
      issue(
        "TITLE_OVERSTATES_ELIGIBILITY",
        "Title or H1 materially overstates eligibility.",
      ),
    );
  }

  if (QUALIFY_DEFINITE.test(text)) {
    errors.push(
      issue(
        "DEFINITE_QUALIFY_LANGUAGE",
        "Draft says the user qualifies. Use may/likely/possible language only.",
      ),
    );
  }

  if (draft.source_claims.length === 0) {
    errors.push(issue("UNMAPPED_CLAIM", "Draft has no source_claims mapping."));
  }
  for (const section of FACTUAL_DRAFT_SECTIONS) {
    if (!factualSectionMatchesClaims(draft, section)) {
      errors.push(
        issue(
          "UNMAPPED_CLAIM",
          `Factual section ${section} contains text that was not composed from mapped claims.`,
        ),
      );
    }
  }
  for (const claim of draft.source_claims) {
    if (!claim.section) {
      errors.push(
        issue("UNMAPPED_CLAIM", `Claim ${claim.claim_id} is missing a draft section.`),
      );
    }
    if (!claim.evidence_path || !pathExists(evidence, claim.evidence_path)) {
      errors.push(
        issue(
          "UNMAPPED_CLAIM",
          `Claim ${claim.claim_id} does not map to evidence path ${claim.evidence_path}.`,
          claim.evidence_path,
        ),
      );
    }
    if (claim.source_url && !isHttpUrl(claim.source_url)) {
      errors.push(
        issue(
          "INVALID_SOURCE_URL",
          `Claim ${claim.claim_id} has a non-http(s) source URL.`,
          claim.evidence_path,
        ),
      );
    }
    if (claim.text && !normalize(text).includes(normalize(claim.text))) {
      warnings.push({
        code: "CLAIM_TEXT_NOT_INLINE",
        message: `Claim ${claim.claim_id} text was not found verbatim in the draft body.`,
        evidence_path: claim.evidence_path,
      });
    }
  }

  const ownTitles = new Set((input.own_titles ?? []).map(normalize));
  ownTitles.add(normalize(evidence.official_name));
  if (evidence.consumer_headline) {
    ownTitles.add(normalize(evidence.consumer_headline));
  }
  const ownSlug = input.own_slug ?? evidence.external_id;
  for (const slug of input.duplicates?.slugs ?? []) {
    if (slug !== ownSlug && slug === (input.own_slug ?? "")) {
      errors.push(
        issue("NEAR_DUPLICATE_CONTENT", `Proposed slug ${slug} already exists.`),
      );
    }
  }
  const proposed = normalize(draft.seo_title);
  for (const title of input.duplicates?.titles ?? []) {
    const normalized = normalize(title);
    if (!normalized || ownTitles.has(normalized)) {
      continue;
    }
    if (normalized === proposed || normalized === normalize(draft.h1)) {
      errors.push(
        issue(
          "NEAR_DUPLICATE_CONTENT",
          `Draft title is a near-duplicate of existing content (${title}).`,
        ),
      );
    }
  }

  for (const link of draft.suggested_internal_links) {
    if (!link.required) {
      continue;
    }
    if (!routeExists(link.href, input.known_routes)) {
      errors.push(
        issue(
          "BROKEN_INTERNAL_LINK",
          `Required internal link ${link.href} does not match a known route.`,
        ),
      );
    }
  }

  for (const source of evidence.official_sources) {
    if (!isHttpUrl(source.url)) {
      errors.push(
        issue("INVALID_SOURCE_URL", `Official source is not http(s): ${source.url}`),
      );
    }
  }

  const timeSensitive = Boolean(
    evidence.deadline.application_deadline || evidence.deadline.effective_end,
  );
  if (evidence.freshness.is_stale && timeSensitive) {
    errors.push(
      issue(
        "STALE_TIME_SENSITIVE",
        "Time-sensitive evidence is stale beyond the 30-day freshness window.",
        "freshness.last_verified_at",
      ),
    );
  } else if (evidence.freshness.is_stale) {
    warnings.push({
      code: "STALE_EVIDENCE",
      message: "Verification is stale, but no structured deadline was present.",
      evidence_path: "freshness.last_verified_at",
    });
  }

  if (
    evidence.eligibility.unmodeled_required &&
    !UNMODELED_MENTION.test(`${draft.who_may_qualify}\n${draft.important_notes}\n${draft.overview}`)
  ) {
    errors.push(
      issue(
        "UNMODELED_CRITERIA_OMITTED",
        "Unmodeled required eligibility was omitted in a way that makes the program sound fully determinable.",
        "eligibility.unmodeled_required",
      ),
    );
  }

  const unique = new Map<string, ValidationIssue>();
  for (const error of errors) {
    unique.set(`${error.code}:${error.message}`, error);
  }

  return {
    passed: unique.size === 0,
    errors: [...unique.values()],
    warnings,
  };
}
