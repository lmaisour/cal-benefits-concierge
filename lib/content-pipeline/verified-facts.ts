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

export function programFaqsCoverQuestion(
  faqs: EditorialFaq[],
  pattern: RegExp,
): boolean {
  return programFaqsWithAnswers(faqs).some((faq) => pattern.test(faq.question));
}
