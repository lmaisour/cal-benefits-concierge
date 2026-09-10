import { describe, expect, it } from "vitest";
import {
  emptyContentEvidenceFormValues,
  isEvidenceConfidence,
  validateContentEvidenceForm,
  validateHttpUrl,
} from "@/lib/admin/validate-content-evidence";

const PROGRAM_ID = "11111111-1111-4111-8111-111111111111";

function validValues() {
  return {
    ...emptyContentEvidenceFormValues(),
    content_section: "Overview",
    claim: "The program may cover rooftop solar for qualifying households.",
    source_url: "https://example.ca.gov/program",
    source_title: "Official handbook",
    source_publisher: "Example agency",
    source_date: "2026-01-15",
    verified_at: "2026-09-10",
    confidence: "HIGH",
  };
}

describe("evidence URL validation", () => {
  it("requires an http or https URL", () => {
    expect(validateHttpUrl("").ok).toBe(false);
    expect(validateHttpUrl("ftp://example.com").ok).toBe(false);
    expect(validateHttpUrl("/relative").ok).toBe(false);
    expect(validateHttpUrl("javascript:alert(1)").ok).toBe(false);
    expect(validateHttpUrl("https://example.ca.gov/path")).toEqual({
      ok: true,
      value: "https://example.ca.gov/path",
    });
    expect(validateHttpUrl("http://example.ca.gov")).toEqual({
      ok: true,
      value: "http://example.ca.gov",
    });
  });
});

describe("evidence confidence", () => {
  it("accepts HIGH, MEDIUM, and LOW only", () => {
    expect(isEvidenceConfidence("HIGH")).toBe(true);
    expect(isEvidenceConfidence("MEDIUM")).toBe(true);
    expect(isEvidenceConfidence("LOW")).toBe(true);
    expect(isEvidenceConfidence("UNKNOWN")).toBe(false);
    expect(isEvidenceConfidence("")).toBe(false);
  });
});

describe("validateContentEvidenceForm", () => {
  it("accepts a complete evidence record", () => {
    const result = validateContentEvidenceForm(validValues(), PROGRAM_ID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.content_section).toBe("Overview");
      expect(result.data.confidence).toBe("HIGH");
      expect(result.data.source_date).toBe("2026-01-15");
      expect(result.data.verified_at).toBe("2026-09-10T00:00:00.000Z");
    }
  });

  it("requires section, claim, URL, confidence, and a program id", () => {
    const result = validateContentEvidenceForm(emptyContentEvidenceFormValues(), "not-a-uuid");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.program_id).toMatch(/program/i);
      expect(result.errors.content_section).toMatch(/required/i);
      expect(result.errors.claim).toMatch(/required/i);
      expect(result.errors.source_url).toMatch(/required/i);
    }
  });

  it("rejects non-http source URLs even when other fields are present", () => {
    const result = validateContentEvidenceForm(
      { ...validValues(), source_url: "ftp://files.example.com/doc" },
      PROGRAM_ID,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.source_url).toMatch(/http/i);
    }
  });

  it("rejects invalid confidence values", () => {
    const result = validateContentEvidenceForm(
      { ...validValues(), confidence: "CERTAIN" },
      PROGRAM_ID,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.confidence).toMatch(/HIGH/);
    }
  });
});
