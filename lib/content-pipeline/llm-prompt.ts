import type { EvidencePackage, SourceClaim } from "@/lib/content-pipeline/types";

export function buildLlmSystemPrompt(): string {
  return [
    "You are arranging a California benefits program draft from server-authored factual atoms.",
    "Select claim_id values only. Never write, rewrite, paraphrase, or invent claim text.",
    "The server will attach canonical text, evidence_path, section, and source_url.",
    "Rules:",
    "- Use only supplied evidence and allowed claim IDs.",
    "- Do not infer missing eligibility. UNKNOWN is not PASS.",
    "- Do not invent amounts, deadlines, geography, or eligibility criteria.",
    "- Do not turn TIERED awards into a min–max range such as $1,350–$2,000.",
    "- Preserve every modeled TIERED award as its own conditional amount.",
    "- Do not present repayable financing as savings, a grant, or free money.",
    "- Do not present a free service or free product as a cash award, rebate, or “how much could I receive?” amount.",
    "- Do not claim Benefits Concierge or this catalog has exhaustive coverage.",
    "- Do not imply the reader is likely eligible beyond modeled rules.",
    "- Distinguish modeled rules from unmodeled required criteria when those atoms exist.",
    "- Preserve application-before-action sequencing atoms when supplied.",
    "- Do not strengthen a sequencing atom into a more specific action than supplied.",
    "- Prefer consumer_headline title atoms when present. Never invent a monetary headline.",
    "- Put detailed TIERED amounts in what_you_get, not overview.",
    "- Prefer the combined how-much FAQ over repeating per-tier FAQ atoms.",
    "- Keep each claim_id in the section the server assigned.",
    "- Prefer concrete program-specific facts to generic introductions and filler.",
    "- Avoid repeating the same benefit summary in overview and what_you_get; prefer what_you_get for benefit details. Never omit required safety atoms or award conditions to reduce repetition.",
    "- Do not use internal catalog language such as structured catalog, not fully modeled, or listed as ACTIVE. ACTIVE status is not the same as open applications or available funding.",
    "- Keep material eligibility requirements together in who_may_qualify, including income limits when supplied.",
    "- Explain material geographic restrictions clearly. Statewide is not the same as every local pathway being open.",
    "- Omit generic FAQ atoms that only repeat another section or say an amount is not listed when another section already states an amount.",
    "- If supplied atoms conflict, especially benefit amounts, geography, or application status, omit the weaker generic atom rather than inventing a resolution.",
    "- Order application steps as supplied by the evidence; do not invent missing steps, documents, income tables, deadlines, examples, or verification dates.",
    "- Return JSON that matches the schema. Do not add extra keys or prose fields.",
  ].join("\n");
}

export function buildLlmUserPrompt(input: {
  evidence: EvidencePackage;
  allowedClaims: SourceClaim[];
  proposedTitle: string;
}): string {
  const { evidence } = input;
  const catalog = input.allowedClaims.map((claim) => ({
    claim_id: claim.claim_id,
    section: claim.section,
    evidence_path: claim.evidence_path,
    text: claim.text,
  }));
  const context = {
    official_name: evidence.official_name,
    status: evidence.status,
    benefit_type: evidence.benefit.type,
    amount_structure: evidence.benefit.amount_structure,
    repayable: evidence.benefit.repayable,
    unmodeled_required: evidence.eligibility.unmodeled_required,
    preapproval_required: evidence.application.preapproval_required,
    purchase_before_approval_allowed: evidence.application.purchase_before_approval_allowed,
    proposed_title: input.proposedTitle,
  };
  return [
    "Arrange a complete draft by selecting allowed claim IDs per section.",
    "- Include safety atoms (not exhaustive, cannot determine personal eligibility, unmodeled criteria, repayable framing, free-service framing, tier conditions) when they appear in the catalog.",
    "- Prefer verified program FAQ atoms over generic FAQ atoms when both exist.",
    "- Do not select unknown-amount FAQ atoms when a benefit amount atom is also selected.",
    `Context: ${JSON.stringify(context)}`,
    `Allowed factual atoms: ${JSON.stringify(catalog)}`,
  ].join("\n");
}
