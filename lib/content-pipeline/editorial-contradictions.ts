import type { ContentDraft, EvidencePackage } from "@/lib/content-pipeline/types";

const UNKNOWN_AMOUNT_COPY =
  /\b(not fully listed|current (?:cash |rebate |tax credit )?amount is not listed|amount is not listed here)\b/i;

const OPEN_APPLICATIONS =
  /\b(now (?:open|available|accepting)|currently (?:open|available|accepting)|accepting applications)\b/i;

const CLOSED_APPLICATIONS =
  /\b(closed to new applications|not accepting new applications|funding (?:is |has been )?(?:exhausted|depleted)|no longer accepting)\b/i;

function extractAmounts(text: string): string[] {
  const found = new Set<string>();
  const pattern = /\$\s*([\d,]+(?:\.\d+)?)/g;
  for (const match of text.matchAll(pattern)) {
    const normalized = match[1]?.replace(/,/g, "");
    if (normalized) {
      found.add(normalized);
    }
  }
  return [...found];
}

function draftText(draft: ContentDraft): string {
  return [
    draft.overview,
    draft.what_you_get,
    draft.who_may_qualify,
    draft.how_to_apply,
    draft.documents,
    draft.important_notes,
    ...draft.faqs.flatMap((faq) => [faq.question, faq.answer]),
  ].join("\n");
}

export type EditorialContradiction = {
  code: "CONTRADICTORY_FACTS" | "MISSING_MATERIAL_FACTS";
  message: string;
  evidence_path?: string;
};

export function detectEditorialContradictions(
  draft: ContentDraft,
  evidence: EvidencePackage,
): EditorialContradiction[] {
  const issues: EditorialContradiction[] = [];
  const benefitText = `${draft.overview}\n${draft.what_you_get}`;
  const faqText = draft.faqs.map((faq) => `${faq.question}\n${faq.answer}`).join("\n");
  const amounts = extractAmounts(benefitText);

  if (amounts.length > 0 && UNKNOWN_AMOUNT_COPY.test(`${faqText}\n${draft.what_you_get}`)) {
    issues.push({
      code: "CONTRADICTORY_FACTS",
      message:
        "Draft states a benefit amount and also says the amount is not listed. Send this to editorial review instead of publishing both claims.",
      evidence_path: "benefit",
    });
  }

  if (
    /\bavailable statewide in california\b/i.test(draft.overview) &&
    /\ba limited service area\b/i.test(draft.overview)
  ) {
    issues.push({
      code: "CONTRADICTORY_FACTS",
      message:
        "Draft describes the program as statewide and as limited-area at the same time.",
      evidence_path: "geography.statewide",
    });
  }

  const text = draftText(draft);
  const mentionsDistinctPathways =
    /\b(pathway|clean cars 4 all|financing assistance|scrap and replace)\b/i.test(text);
  if (
    OPEN_APPLICATIONS.test(text) &&
    CLOSED_APPLICATIONS.test(text) &&
    !mentionsDistinctPathways
  ) {
    issues.push({
      code: "CONTRADICTORY_FACTS",
      message:
        "Draft describes applications as both open and closed without distinguishing pathways. Send this to editorial review.",
      evidence_path: "status",
    });
  }

  if (
    (evidence.benefit.amount_structure === "SINGLE" ||
      evidence.benefit.amount_structure === "RANGE") &&
    evidence.benefit.amounts_are_structured_facts &&
    extractAmounts(draft.what_you_get).length === 0
  ) {
    issues.push({
      code: "MISSING_MATERIAL_FACTS",
      message:
        "Structured benefit amounts are present in evidence but missing from What you get. Do not invent a substitute amount.",
      evidence_path: "benefit",
    });
  }

  return issues;
}
