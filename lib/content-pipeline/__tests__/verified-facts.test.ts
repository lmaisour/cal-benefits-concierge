import { describe, expect, it } from "vitest";
import { buildEvidencePackage } from "@/lib/content-pipeline/build-evidence-package";
import {
  isAuthoritativeVerifiedEvidenceRow,
  officialSourceUrlSet,
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
