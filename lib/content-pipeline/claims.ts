import type {
  ContentDraft,
  FactualDraftSection,
  SourceClaim,
} from "@/lib/content-pipeline/types";

export const FACTUAL_SECTION_JOIN: Record<
  Exclude<FactualDraftSection, "faqs">,
  string
> = {
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
    .map((claim) => claim.text.trim())
    .filter(Boolean)
    .join(FACTUAL_SECTION_JOIN[section]);
}

export function renderFaqAnswers(claims: SourceClaim[]): string[] {
  return claimsForSection(claims, "faqs")
    .map((claim) => claim.text.trim())
    .filter(Boolean);
}

export function factualSectionText(
  draft: Pick<
    ContentDraft,
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
    return draft.faqs.map((faq) => faq.answer).join("\n");
  }
  return draft[section];
}

export function expectedFactualSection(
  claims: SourceClaim[],
  section: FactualDraftSection,
): string {
  if (section === "faqs") {
    return renderFaqAnswers(claims).join("\n");
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
