import { describe, expect, it } from "vitest";
import { buildEvidencePackage } from "@/lib/content-pipeline/build-evidence-package";
import {
  authoritativeProgramFaqs,
  isAuthoritativeProgramFaq,
  isAuthoritativeVerifiedEvidenceRow,
  officialSourceUrlSet,
  programFaqIsSafeForDraft,
  verifiedFactsForSection,
} from "@/lib/content-pipeline/verified-facts";
import { makeRecord, NOW } from "./fixtures";

describe("verified evidence provenance gates", () => {
  it("accepts only HIGH-confidence verified rows from official sources", () => {
    const evidence = buildEvidencePackage(
      makeRecord({
        evidence_rows: [
          {
            content_section: "eligibility",
            claim: "The front yard must have 500 to 3,000 square feet of green grass.",
            source_url: "https://example.invalid/official",
            verified_at: "2026-09-12T00:00:00.000Z",
            confidence: "HIGH",
          },
        ],
      }),
      NOW,
    );
    const official = officialSourceUrlSet(evidence);
    expect(
      isAuthoritativeVerifiedEvidenceRow(evidence.content_evidence[0], official),
    ).toBe(true);
    expect(verifiedFactsForSection(evidence, "who_may_qualify")).toHaveLength(1);
  });

  it("rejects unofficial URLs, missing verification, and non-HIGH confidence", () => {
    const evidence = buildEvidencePackage(
      makeRecord({
        evidence_rows: [
          {
            content_section: "eligibility",
            claim: "Veterans automatically qualify.",
            source_url: "https://example.invalid/blog",
            verified_at: "2026-09-12T00:00:00.000Z",
            confidence: "HIGH",
          },
          {
            content_section: "eligibility",
            claim: "The front yard must have 500 to 3,000 square feet of green grass.",
            source_url: "https://example.invalid/official",
            verified_at: null,
            confidence: "HIGH",
          },
          {
            content_section: "eligibility",
            claim: "Parkway grass may count.",
            source_url: "https://example.invalid/official",
            verified_at: "2026-09-12T00:00:00.000Z",
            confidence: "MEDIUM",
          },
        ],
      }),
      NOW,
    );
    expect(verifiedFactsForSection(evidence, "who_may_qualify")).toEqual([]);
  });
});

describe("program FAQ provenance gates", () => {
  it("rejects a populated language-safe FAQ with no independent grounding", () => {
    const faq = {
      question: "What happens after I apply?",
      answer: "Staff review applications in the order they arrive.",
    };
    const evidence = buildEvidencePackage(
      makeRecord({
        program: { benefit_type: "FREE_SERVICE", benefit_min: null, benefit_max: null },
        faqs: [faq],
      }),
      NOW,
    );
    expect(programFaqIsSafeForDraft(faq)).toBe(true);
    expect(isAuthoritativeProgramFaq(faq, evidence)).toBe(false);
    expect(authoritativeProgramFaqs(evidence)).toEqual([]);
  });

  it("accepts a FAQ whose answer is independently grounded in HIGH official evidence", () => {
    const faq = {
      question: "How much grass do I need?",
      answer: "The front yard must have 500 to 3,000 square feet of green grass.",
    };
    const evidence = buildEvidencePackage(
      makeRecord({
        program: { benefit_type: "FREE_SERVICE", benefit_min: null, benefit_max: null },
        evidence_rows: [
          {
            content_section: "eligibility",
            claim: "The front yard must have 500 to 3,000 square feet of green grass.",
            source_url: "https://example.invalid/official",
            verified_at: "2026-09-12T00:00:00.000Z",
            confidence: "HIGH",
          },
        ],
        faqs: [faq],
      }),
      NOW,
    );
    expect(isAuthoritativeProgramFaq(faq, evidence)).toBe(true);
    expect(authoritativeProgramFaqs(evidence)).toEqual([faq]);
  });
});
