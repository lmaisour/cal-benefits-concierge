import { describe, expect, it } from "vitest";
import {
  emptyContentFormValues,
  validateContentForm,
} from "@/lib/admin/validate-content";

describe("validateContentForm", () => {
  it("stores blank editorial fields as null", () => {
    const result = validateContentForm(emptyContentFormValues());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.overview).toBeNull();
      expect(result.data.seo_title).toBeNull();
      expect(result.data.how_to_apply).toBeNull();
    }
  });

  it("rejects overly long SEO fields", () => {
    const result = validateContentForm({
      ...emptyContentFormValues(),
      seo_title: "x".repeat(121),
      meta_description: "y".repeat(321),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.seo_title).toMatch(/120/);
      expect(result.errors.meta_description).toMatch(/320/);
    }
  });
});
