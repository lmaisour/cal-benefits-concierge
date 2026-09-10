import { describe, expect, it } from "vitest";
import {
  emptyContentBriefFormValues,
  isSafeSeoProvider,
  normalizeSeoProvider,
  parseKeywordList,
  validateContentBriefForm,
  validateContentBriefOwnership,
} from "@/lib/admin/validate-content-brief";
import { DEFAULT_SEO_PROVIDER } from "@/types/database";

const PROGRAM_ID = "11111111-1111-4111-8111-111111111111";
const GUIDE_ID = "22222222-2222-4222-8222-222222222222";

describe("content brief ownership", () => {
  it("requires a program and forbids a guide on PROGRAM briefs", () => {
    expect(
      validateContentBriefOwnership({ contentType: "PROGRAM", programId: PROGRAM_ID }),
    ).toEqual({ ok: true });
    expect(
      validateContentBriefOwnership({ contentType: "PROGRAM", programId: PROGRAM_ID, guideId: GUIDE_ID }),
    ).toEqual({
      ok: false,
      error: "A PROGRAM brief must belong to a program and not a guide.",
    });
    expect(validateContentBriefOwnership({ contentType: "PROGRAM" }).ok).toBe(false);
  });

  it("requires a guide and forbids a program on GUIDE briefs", () => {
    expect(
      validateContentBriefOwnership({ contentType: "GUIDE", guideId: GUIDE_ID }),
    ).toEqual({ ok: true });
    expect(
      validateContentBriefOwnership({
        contentType: "GUIDE",
        programId: PROGRAM_ID,
        guideId: GUIDE_ID,
      }).ok,
    ).toBe(false);
    expect(validateContentBriefOwnership({ contentType: "GUIDE", programId: PROGRAM_ID }).ok).toBe(
      false,
    );
  });
});

describe("seo provider identifiers", () => {
  it("defaults blank values to manual", () => {
    expect(normalizeSeoProvider("")).toBe(DEFAULT_SEO_PROVIDER);
    expect(normalizeSeoProvider("  ")).toBe(DEFAULT_SEO_PROVIDER);
  });

  it("accepts future provider names without a schema enum", () => {
    expect(isSafeSeoProvider("manual")).toBe(true);
    expect(isSafeSeoProvider("frase")).toBe(true);
    expect(isSafeSeoProvider("other-provider")).toBe(true);
  });

  it("rejects unsafe provider values", () => {
    expect(isSafeSeoProvider("Frase")).toBe(false);
    expect(isSafeSeoProvider("openai client")).toBe(false);
    expect(isSafeSeoProvider("../secret")).toBe(false);
    expect(isSafeSeoProvider("x".repeat(40))).toBe(false);
  });
});

describe("validateContentBriefForm", () => {
  it("stores a PROGRAM brief with default manual provider", () => {
    const result = validateContentBriefForm(emptyContentBriefFormValues(), {
      contentType: "PROGRAM",
      programId: PROGRAM_ID,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.content_type).toBe("PROGRAM");
      expect(result.data.program_id).toBe(PROGRAM_ID);
      expect(result.data.guide_id).toBeNull();
      expect(result.data.seo_provider).toBe("manual");
      expect(result.data.secondary_keywords).toEqual([]);
    }
  });

  it("stores a GUIDE brief without a program_id", () => {
    const result = validateContentBriefForm(
      {
        ...emptyContentBriefFormValues(),
        primary_keyword: "california benefits",
        seo_provider: "Frase",
        secondary_keywords: "rebates, tax credit\nutility help",
        questions_to_answer: "Who qualifies?\nHow do I apply?",
      },
      { contentType: "GUIDE", guideId: GUIDE_ID },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.content_type).toBe("GUIDE");
      expect(result.data.guide_id).toBe(GUIDE_ID);
      expect(result.data.program_id).toBeNull();
      expect(result.data.seo_provider).toBe("frase");
      expect(result.data.secondary_keywords).toEqual([
        "rebates",
        "tax credit",
        "utility help",
      ]);
      expect(result.data.questions_to_answer).toEqual([
        "Who qualifies?",
        "How do I apply?",
      ]);
    }
  });

  it("rejects mixed ownership and overlong suggested SEO fields", () => {
    const mixed = validateContentBriefForm(emptyContentBriefFormValues(), {
      contentType: "PROGRAM",
      programId: PROGRAM_ID,
      guideId: GUIDE_ID,
    });
    expect(mixed.ok).toBe(false);

    const long = validateContentBriefForm(
      {
        ...emptyContentBriefFormValues(),
        suggested_title: "x".repeat(121),
        suggested_meta_description: "y".repeat(321),
        seo_provider: "not a provider",
      },
      { contentType: "PROGRAM", programId: PROGRAM_ID },
    );
    expect(long.ok).toBe(false);
    if (!long.ok) {
      expect(long.errors.suggested_title).toMatch(/120/);
      expect(long.errors.suggested_meta_description).toMatch(/320/);
      expect(long.errors.seo_provider).toMatch(/identifier/i);
    }
  });
});

describe("parseKeywordList", () => {
  it("splits commas and lines and drops blanks", () => {
    expect(parseKeywordList("one, two\n two\n")).toEqual(["one", "two"]);
  });
});
