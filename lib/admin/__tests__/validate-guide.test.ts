import { describe, expect, it } from "vitest";
import { emptyGuideFormValues, validateGuideForm } from "@/lib/admin/validate-guide";

describe("validateGuideForm", () => {
  it("requires title and a lowercase slug", () => {
    const result = validateGuideForm(emptyGuideFormValues());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.title).toMatch(/required/i);
      expect(result.errors.slug).toMatch(/required/i);
    }
  });

  it("accepts a draft with related program IDs", () => {
    const result = validateGuideForm({
      ...emptyGuideFormValues(),
      title: "How to apply for ESA",
      slug: "how-to-apply-for-esa",
      related_program_ids: ["11111111-1111-1111-1111-111111111111"],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.published).toBe(false);
      expect(result.relatedProgramIds).toHaveLength(1);
    }
  });

  it("sets published_at when publishing without a date", () => {
    const result = validateGuideForm({
      ...emptyGuideFormValues(),
      title: "Draft",
      slug: "draft",
      published: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.published_at).toBeTruthy();
    }
  });

  it("rejects invalid related program IDs", () => {
    const result = validateGuideForm({
      ...emptyGuideFormValues(),
      title: "Guide",
      slug: "guide",
      related_program_ids: ["not-a-uuid"],
    });
    expect(result.ok).toBe(false);
  });
});
