import type {
  ContentDraft,
  FactualDraftSection,
  SourceClaim,
} from "@/lib/content-pipeline/types";

export const FACTUAL_SECTION_JOIN: Record<
  Exclude<FactualDraftSection, "faqs">,
  string
> = {
  seo_title: "",
  meta_description: "",
  h1: "",
  dek: " ",
  overview: " ",
  what_you_get: " ",
  who_may_qualify: "\n",
  how_to_apply: " ",
  documents: " ",
  important_notes: "\n\n",
};

export function normalizeClaimText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function claimsForSection(
  claims: SourceClaim[],
  section: FactualDraftSection,
): SourceClaim[] {
  return claims.filter((claim) => claim.section === section);
}

export function renderFactualSection(
  claims: SourceClaim[],
  section: Exclude<FactualDraftSection, "faqs">,
): string {
  return claimsForSection(claims, section)
    .map((claim) => claim.text)
    .filter((text) => text.trim().length > 0)
    .join(FACTUAL_SECTION_JOIN[section]);
}

export function renderFaqAnswers(claims: SourceClaim[]): string[] {
  return renderFaqs(claims)
    .map((faq) => faq.answer.trim())
    .filter(Boolean);
}

export function renderFaqs(claims: SourceClaim[]): Array<{
  question: string;
  answer: string;
}> {
  const faqClaims = claimsForSection(claims, "faqs");
  const keys: string[] = [];
  for (const item of faqClaims) {
    const key = item.claim_id.replace(/^faq-[qa]-/, "");
    if (key && !keys.includes(key)) {
      keys.push(key);
    }
  }
  return keys
    .map((key) => {
      const question =
        faqClaims.find((item) => item.claim_id === `faq-q-${key}`)?.text.trim() ?? "";
      const answer =
        faqClaims.find((item) => item.claim_id === `faq-a-${key}`)?.text.trim() ?? "";
      return { question, answer };
    })
    .filter((faq) => faq.question.length > 0 || faq.answer.length > 0);
}

export function factualSectionText(
  draft: Pick<
    ContentDraft,
    | "seo_title"
    | "meta_description"
    | "h1"
    | "dek"
    | "overview"
    | "what_you_get"
    | "who_may_qualify"
    | "how_to_apply"
    | "documents"
    | "important_notes"
    | "faqs"
  >,
  section: FactualDraftSection,
): string {
  if (section === "faqs") {
    return draft.faqs
      .map((faq) => `${faq.question.trim()}\n${faq.answer.trim()}`)
      .join("\n");
  }
  return draft[section];
}

export function expectedFactualSection(
  claims: SourceClaim[],
  section: FactualDraftSection,
): string {
  if (section === "faqs") {
    return renderFaqs(claims)
      .map((faq) => `${faq.question.trim()}\n${faq.answer.trim()}`)
      .join("\n");
  }
  return renderFactualSection(claims, section);
}

export function factualSectionMatchesClaims(
  draft: ContentDraft,
  section: FactualDraftSection,
): boolean {
  return (
    normalizeClaimText(factualSectionText(draft, section)) ===
    normalizeClaimText(expectedFactualSection(draft.source_claims, section))
  );
}

export function sourceClaimFingerprint(
  claim: Pick<SourceClaim, "claim_id" | "section" | "evidence_path" | "text">,
): string {
  return [
    normalizeClaimText(claim.claim_id),
    claim.section,
    claim.evidence_path.trim(),
    normalizeClaimText(claim.text),
  ].join("\n");
}

export function isAuthoritativeSourceClaim(
  claim: Pick<SourceClaim, "claim_id" | "section" | "evidence_path" | "text">,
  allowed: Array<Pick<SourceClaim, "claim_id" | "section" | "evidence_path" | "text">>,
): boolean {
  const key = sourceClaimFingerprint(claim);
  return allowed.some((item) => sourceClaimFingerprint(item) === key);
}
