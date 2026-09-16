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
    "- Do not claim Benefits Concierge or this catalog has exhaustive coverage.",
    "- Do not imply the reader is likely eligible beyond modeled rules.",
    "- Distinguish modeled rules from unmodeled required criteria when those atoms exist.",
    "- Preserve application-before-purchase or retire-after-approval atoms when supplied.",
    "- Keep each claim_id in the section the server assigned.",
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
    amount_structure: evidence.benefit.amount_structure,
    repayable: evidence.benefit.repayable,
    unmodeled_required: evidence.eligibility.unmodeled_required,
    preapproval_required: evidence.application.preapproval_required,
    purchase_before_approval_allowed: evidence.application.purchase_before_approval_allowed,
    proposed_title: input.proposedTitle,
  };
  return [
    "Arrange a complete draft by selecting allowed claim IDs per section.",
    "Include safety atoms (not exhaustive, cannot determine personal eligibility, unmodeled criteria, repayable framing, tier conditions) when they appear in the catalog.",
    `Context: ${JSON.stringify(context)}`,
    `Allowed factual atoms: ${JSON.stringify(catalog)}`,
  ].join("\n");
}
