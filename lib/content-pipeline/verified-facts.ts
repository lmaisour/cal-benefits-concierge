import {
  formatUtcCalendarDate,
  parseUtcCalendarDate,
  utcCalendarIso,
} from "@/lib/programs/calendar";
import type {
  EditorialEvidenceRow,
  EditorialFaq,
  EvidencePackage,
  FactualDraftSection,
} from "@/lib/content-pipeline/types";

const ELIGIBILITY_SECTIONS = new Set(["eligibility", "who_may_qualify"]);
const BENEFIT_SECTIONS = new Set(["benefit", "what_you_get"]);
const NOTES_SECTIONS = new Set([
  "important_notes",
  "status",
  "overview",
  "faq",
  "faqs",
]);
const APPLICATION_SECTIONS = new Set(["application", "how_to_apply"]);
const DOCUMENT_SECTIONS = new Set(["documents", "documents_needed"]);

export function normalizeFactText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function normalizeOfficialUrl(value: string): string {
  return value.trim().replace(/\/+$/, "").toLowerCase();
}

export function officialSourceUrlSet(evidence: EvidencePackage): Set<string> {
  return new Set(
    evidence.official_sources.map((source) => normalizeOfficialUrl(source.url)),
  );
}

export function isNearDuplicateFact(candidate: string, existing: string): boolean {
  const left = normalizeFactText(candidate);
  const right = normalizeFactText(existing);
  if (!left || !right) {
    return false;
  }
  if (left === right) {
    return true;
  }
  if (
    left.length >= 24 &&
    right.length >= 24 &&
    (left.includes(right) || right.includes(left))
  ) {
    return true;
  }
  const leftTokens = new Set(left.split(" ").filter((token) => token.length > 2));
  const rightTokens = new Set(right.split(" ").filter((token) => token.length > 2));
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return false;
  }
  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  }
  const union = leftTokens.size + rightTokens.size - intersection;
  const jaccard = intersection / union;
  const overlap =
    intersection / Math.min(leftTokens.size, rightTokens.size);
  return jaccard >= 0.72 || overlap >= 0.82;
}

export function isCoveredByExisting(
  candidate: string,
  existing: Array<string | null | undefined>,
): boolean {
  return existing.some(
    (item) => typeof item === "string" && isNearDuplicateFact(candidate, item),
  );
}

export function isAuthoritativeVerifiedEvidenceRow(
  row: EditorialEvidenceRow,
  officialUrls: Set<string>,
): boolean {
  if (row.confidence !== "HIGH") {
    return false;
  }
  if (!row.verified_at?.trim()) {
    return false;
  }
  if (!row.claim?.trim()) {
    return false;
  }
  if (!row.source_url?.trim()) {
    return false;
  }
  return officialUrls.has(normalizeOfficialUrl(row.source_url));
}

export type VerifiedEvidenceAtom = {
  index: number;
  row: EditorialEvidenceRow;
  draft_section: FactualDraftSection;
};

export function mapEvidenceSectionToDraft(
  contentSection: string,
): FactualDraftSection | null {
  const section = contentSection.trim().toLowerCase();
  if (ELIGIBILITY_SECTIONS.has(section)) {
    return "who_may_qualify";
  }
  if (BENEFIT_SECTIONS.has(section)) {
    return "what_you_get";
  }
  if (APPLICATION_SECTIONS.has(section)) {
    return "how_to_apply";
  }
  if (DOCUMENT_SECTIONS.has(section)) {
    return "documents";
  }
  if (NOTES_SECTIONS.has(section)) {
    return "important_notes";
  }
  return null;
}

export function authoritativeVerifiedEvidence(
  evidence: EvidencePackage,
): VerifiedEvidenceAtom[] {
  const officialUrls = officialSourceUrlSet(evidence);
  return evidence.content_evidence.flatMap((row, index) => {
    if (!isAuthoritativeVerifiedEvidenceRow(row, officialUrls)) {
      return [];
    }
    const draft_section = mapEvidenceSectionToDraft(row.content_section);
    if (!draft_section) {
      return [];
    }
    return [{ index, row, draft_section }];
  });
}

export function verifiedFactsForSection(
  evidence: EvidencePackage,
  section: FactualDraftSection,
): VerifiedEvidenceAtom[] {
  return authoritativeVerifiedEvidence(evidence).filter(
    (item) => item.draft_section === section,
  );
}

export function programFaqsWithAnswers(faqs: EditorialFaq[]): EditorialFaq[] {
  return faqs.filter(
    (faq) => faq.question.trim().length > 0 && faq.answer.trim().length > 0,
  );
}

const DEFINITE_QUALIFY_IN_FAQ =
  /\b(you qualify|you are eligible|you're eligible|you will qualify|guaranteed to qualify|automatically qualify|you are approved)\b/i;

export function programFaqIsSafeForDraft(faq: EditorialFaq): boolean {
  return !DEFINITE_QUALIFY_IN_FAQ.test(`${faq.question}\n${faq.answer}`);
}

const GROUNDING_STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "are",
  "was",
  "were",
  "have",
  "has",
  "been",
  "not",
  "you",
  "your",
  "may",
  "can",
  "also",
  "than",
  "into",
  "over",
  "such",
  "only",
  "any",
  "all",
  "but",
  "its",
  "their",
  "they",
  "them",
  "who",
  "how",
  "what",
  "when",
  "does",
  "did",
  "will",
  "would",
  "should",
  "about",
  "after",
  "before",
  "because",
  "while",
  "where",
  "which",
  "or",
  "an",
  "of",
  "to",
  "in",
  "on",
  "at",
  "by",
  "as",
  "is",
  "if",
  "a",
  "be",
  "do",
  "no",
  "yes",
]);

const FAQ_ELIGIBILITY_HINTS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bveterans?\b/i, label: "veteran" },
  { pattern: /\bdisabilit/i, label: "disability" },
  { pattern: /\b(?:household )?income\b/i, label: "income" },
  { pattern: /\bhousehold size\b/i, label: "household size" },
  { pattern: /\bhomeowners?\b/i, label: "homeowner" },
  { pattern: /\brenters?\b/i, label: "renter" },
];

function contentTokens(value: string): Set<string> {
  return new Set(
    normalizeFactText(value)
      .split(" ")
      .filter((token) => token.length > 2 && !GROUNDING_STOPWORDS.has(token)),
  );
}

function tokenOverlapCoefficient(left: string, right: string): number {
  const leftTokens = contentTokens(left);
  const rightTokens = contentTokens(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  }
  return intersection / Math.min(leftTokens.size, rightTokens.size);
}

function tokenCoverage(candidate: string, corpus: string): number {
  const candidateTokens = contentTokens(candidate);
  if (candidateTokens.size === 0) {
    return 0;
  }
  const corpusTokens = contentTokens(corpus);
  let covered = 0;
  for (const token of candidateTokens) {
    if (corpusTokens.has(token)) {
      covered += 1;
    }
  }
  return covered / candidateTokens.size;
}

function extractDollarAmounts(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(/\$\s*([\d,]+(?:\.\d+)?)/g)) {
    found.add(match[1].replace(/,/g, ""));
  }
  return [...found];
}

const MONTH_INDEX: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

function canonicalDatesFromText(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)) {
    const parsed = parseUtcCalendarDate(match[1]);
    if (parsed) {
      found.add(utcCalendarIso(parsed));
    }
  }
  const monthNameDate =
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/gi;
  for (const match of text.matchAll(monthNameDate)) {
    const month = MONTH_INDEX[match[1].toLowerCase()];
    const day = Number(match[2]);
    const year = Number(match[3]);
    if (month === undefined) {
      continue;
    }
    const parsed = new Date(Date.UTC(year, month, day));
    if (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month &&
      parsed.getUTCDate() === day
    ) {
      found.add(utcCalendarIso(parsed));
    }
  }
  return [...found];
}

function structuredDeadlineTexts(evidence: EvidencePackage): string[] {
  const texts: string[] = [];
  for (const value of [
    evidence.deadline.application_deadline,
    evidence.deadline.effective_end,
  ]) {
    if (!value?.trim()) {
      continue;
    }
    texts.push(value);
    const parsed = parseUtcCalendarDate(value);
    if (parsed) {
      texts.push(utcCalendarIso(parsed), formatUtcCalendarDate(parsed));
    }
  }
  return texts;
}

/**
 * Independently authoritative texts that may ground a stored FAQ.
 *
 * program_faqs has no source_url, verified_at, or confidence columns, so a
 * stored row is never authoritative by itself. Grounding uses catalog
 * structured facts, gold-standard content paths other than overview blobs,
 * and HIGH + verified + official-source content_evidence claims.
 */
export function authoritativeGroundingTexts(evidence: EvidencePackage): string[] {
  const texts: string[] = [
    evidence.official_name,
    evidence.consumer_headline ?? "",
    evidence.short_description ?? "",
    evidence.benefit.summary ?? "",
    evidence.benefit.type.replaceAll("_", " "),
    evidence.eligibility.unmodeled_summary ?? "",
    evidence.application.how_to_apply ?? "",
    evidence.application.documents ?? "",
    evidence.existing_content?.benefit_explanation ?? "",
    evidence.existing_content?.important_notes ?? "",
    evidence.boilerplate.unknown_amount_guidance,
    ...structuredDeadlineTexts(evidence),
    ...evidence.eligibility.modeled_rules.map((rule) => rule.explanation ?? ""),
    ...authoritativeVerifiedEvidence(evidence).map((item) => item.row.claim),
  ];
  if (evidence.benefit.min !== null) {
    texts.push(String(evidence.benefit.min));
  }
  if (evidence.benefit.max !== null) {
    texts.push(String(evidence.benefit.max));
  }
  for (const tier of evidence.benefit.tiers) {
    texts.push(tier.label, tier.condition_summary);
    if (tier.amount !== null) {
      texts.push(String(tier.amount));
    }
  }
  return texts.filter((text) => text.trim().length > 0);
}

function faqHasDistinctiveAtomSupport(faqText: string, atoms: string[]): boolean {
  const normalizedFaq = normalizeFactText(faqText);
  return atoms.some((atom) => {
    const normalizedAtom = normalizeFactText(atom);
    if (normalizedAtom.length >= 24 && normalizedFaq.includes(normalizedAtom)) {
      return true;
    }
    return tokenOverlapCoefficient(faqText, atom) >= 0.45;
  });
}

function faqIntroducesUnsupportedFacts(
  faqText: string,
  grounding: string,
  evidence: EvidencePackage,
): boolean {
  const allowedAmounts = new Set(extractDollarAmounts(grounding));
  if (evidence.benefit.min !== null) {
    allowedAmounts.add(String(evidence.benefit.min));
  }
  if (evidence.benefit.max !== null) {
    allowedAmounts.add(String(evidence.benefit.max));
  }
  for (const tier of evidence.benefit.tiers) {
    if (tier.amount !== null) {
      allowedAmounts.add(String(tier.amount));
    }
  }
  if (extractDollarAmounts(faqText).some((amount) => !allowedAmounts.has(amount))) {
    return true;
  }

  const allowedDates = new Set(canonicalDatesFromText(grounding));
  if (canonicalDatesFromText(faqText).some((date) => !allowedDates.has(date))) {
    return true;
  }

  return FAQ_ELIGIBILITY_HINTS.some(
    (hint) => hint.pattern.test(faqText) && !hint.pattern.test(grounding),
  );
}

/**
 * A stored program_faqs row is not authoritative merely because it exists.
 * It becomes an allowed factual claim only when its wording is grounded in
 * independently authoritative evidence/content paths and remains language-safe.
 */
export function isAuthoritativeProgramFaq(
  faq: EditorialFaq,
  evidence: EvidencePackage,
): boolean {
  if (!faq.question.trim() || !faq.answer.trim()) {
    return false;
  }
  if (!programFaqIsSafeForDraft(faq)) {
    return false;
  }
  const atoms = authoritativeGroundingTexts(evidence);
  if (atoms.length === 0) {
    return false;
  }
  const faqText = `${faq.question}\n${faq.answer}`;
  const grounding = atoms.join("\n");
  if (faqIntroducesUnsupportedFacts(faqText, grounding, evidence)) {
    return false;
  }
  if (!faqHasDistinctiveAtomSupport(faqText, atoms)) {
    return false;
  }
  return tokenCoverage(faq.answer, grounding) >= 0.55;
}

export function authoritativeProgramFaqs(evidence: EvidencePackage): EditorialFaq[] {
  return evidence.faqs.filter((faq) => isAuthoritativeProgramFaq(faq, evidence));
}

export function programFaqsCoverQuestion(
  faqs: EditorialFaq[],
  pattern: RegExp,
): boolean {
  return faqs.some((faq) => pattern.test(faq.question));
}
