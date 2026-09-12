import { describe, expect, it } from "vitest";
import {
  emptyProgramFormValues,
  parseOptionalNumber,
  parseOptionalUrl,
  validateProgramForm,
} from "@/lib/admin/validate-program";

function validValues() {
  return {
    ...emptyProgramFormValues(),
    name: "Clean Cars 4 All",
    slug: "clean-cars-4-all",
    category: "vehicles",
    benefit_type: "REBATE",
    status: "ACTIVE",
    official_url: "https://example.com/program",
    benefit_min: "1000",
    benefit_max: "7500",
  };
}

describe("validateProgramForm", () => {
  it("accepts a complete program", () => {
    const result = validateProgramForm(validValues());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.slug).toBe("clean-cars-4-all");
      expect(result.data.benefit_min).toBe(1000);
      expect(result.data.benefit_max).toBe(7500);
      expect(result.data.official_url).toBe("https://example.com/program");
      expect(result.data.active).toBe(true);
    }
  });

  it("requires name, slug, category, benefit type, and status", () => {
    const result = validateProgramForm(emptyProgramFormValues());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.name).toMatch(/required/i);
      expect(result.errors.slug).toMatch(/required/i);
      expect(result.errors.category).toMatch(/required/i);
      expect(result.errors.benefit_type).toMatch(/valid benefit type/i);
      expect(result.errors.status).toBeUndefined();
    }
  });

  it("rejects invalid slugs and URLs", () => {
    const slugResult = validateProgramForm({
      ...validValues(),
      slug: "Not A Slug",
    });
    expect(slugResult.ok).toBe(false);
    if (!slugResult.ok) {
      expect(slugResult.errors.slug).toMatch(/lowercase/i);
    }

    const urlResult = validateProgramForm({
      ...validValues(),
      official_url: "javascript:alert(1)",
      application_url: "not-a-url",
    });
    expect(urlResult.ok).toBe(false);
    if (!urlResult.ok) {
      expect(urlResult.errors.official_url).toMatch(/http/i);
      expect(urlResult.errors.application_url).toMatch(/http/i);
    }
  });

  it("rejects invalid numeric benefit fields", () => {
    const result = validateProgramForm({
      ...validValues(),
      benefit_min: "12px",
      benefit_max: "1e999",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.benefit_min).toMatch(/number/i);
      expect(result.errors.benefit_max).toMatch(/number/i);
    }
  });

  it("accepts consumer presentation fields and normalizes tags", () => {
    const result = validateProgramForm({
      ...validValues(),
      consumer_headline: "Free rides for 90 days",
      administrator_display_name: "LA Metro",
      audience_tags: "Low income\nTransit\nLow income\n",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.consumer_headline).toBe("Free rides for 90 days");
      expect(result.data.administrator_display_name).toBe("LA Metro");
      expect(result.data.audience_tags).toEqual(["Low income", "Transit"]);
    }
  });

  it("rejects oversized headlines, display names, and tags", () => {
    const headline = validateProgramForm({
      ...validValues(),
      consumer_headline: "x".repeat(81),
    });
    expect(headline.ok).toBe(false);
    if (!headline.ok) {
      expect(headline.errors.consumer_headline).toMatch(/80/);
    }

    const displayName = validateProgramForm({
      ...validValues(),
      administrator_display_name: "x".repeat(61),
    });
    expect(displayName.ok).toBe(false);

    const tags = validateProgramForm({
      ...validValues(),
      audience_tags: "One\nTwo\nThree\nFour\nFive\nSix\nSeven",
    });
    expect(tags.ok).toBe(false);
    if (!tags.ok) {
      expect(tags.errors.audience_tags).toMatch(/6/);
    }
  });

  it("accepts a nullable application deadline without changing effective_end", () => {
    const result = validateProgramForm({
      ...validValues(),
      application_deadline: "2026-10-31",
      effective_end: "",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.application_deadline).toBe("2026-10-31");
      expect(result.data.effective_end).toBeNull();
    }
  });

  it("rejects a maximum below the minimum", () => {
    const result = validateProgramForm({
      ...validValues(),
      benefit_min: "5000",
      benefit_max: "1000",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.benefit_max).toMatch(/minimum/i);
    }
  });
});

describe("parseOptionalNumber and parseOptionalUrl", () => {
  it("treats blank numbers and URLs as null", () => {
    expect(parseOptionalNumber("")).toEqual({ ok: true, value: null });
    expect(parseOptionalUrl("")).toEqual({ ok: true, value: null });
  });

  it("rejects NaN, Infinity, and non-http URLs", () => {
    expect(parseOptionalNumber("NaN").ok).toBe(false);
    expect(parseOptionalNumber("Infinity").ok).toBe(false);
    expect(parseOptionalUrl("ftp://example.com").ok).toBe(false);
    expect(parseOptionalUrl("/relative").ok).toBe(false);
  });
});
