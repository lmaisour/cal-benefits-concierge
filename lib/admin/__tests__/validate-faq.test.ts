import { describe, expect, it } from "vitest";
import { validateFaqForm } from "@/lib/admin/validate-faq";

describe("validateFaqForm", () => {
  it("requires question, answer, and integer display order", () => {
    const missing = validateFaqForm({ question: "", answer: "", sort_order: "" });
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.errors.question).toMatch(/required/i);
      expect(missing.errors.answer).toMatch(/required/i);
      expect(missing.errors.sort_order).toMatch(/order/i);
    }
  });

  it("accepts a complete FAQ", () => {
    const result = validateFaqForm({
      question: "Who may apply?",
      answer: "Confirm with the official administrator.",
      sort_order: "10",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.sort_order).toBe(10);
    }
  });

  it("rejects fractional display order", () => {
    const result = validateFaqForm({
      question: "Question",
      answer: "Answer",
      sort_order: "1.5",
    });
    expect(result.ok).toBe(false);
  });
});
