import { describe, expect, it } from "vitest";
import {
  validateFollowupQuestionForm,
  validateFollowupRuleForm,
} from "@/lib/admin/validate-followup";

describe("validateFollowupQuestionForm", () => {
  it("accepts a well-formed single-choice question", () => {
    const result = validateFollowupQuestionForm({
      question_key: "ladwp_water_service",
      question: "Does LADWP provide water service to this property?",
      help_text: "",
      answer_type: "single_choice",
      options: '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]',
      sort_order: "10",
      required: true,
      display_when_field: "",
      display_when_operator: "",
      display_when_value: "",
      active: true,
      cta_label: "Check LEAP eligibility",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a UserProfile field used as a display condition incorrectly", () => {
    const result = validateFollowupQuestionForm({
      question_key: "property_owner_permission",
      question: "Can you get written permission?",
      help_text: "",
      answer_type: "single_choice",
      options: "[]",
      sort_order: "1",
      required: true,
      display_when_field: "not_a_profile_field",
      display_when_operator: "not_equals",
      display_when_value: '"owner"',
      active: true,
      cta_label: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.display_when_field).toMatch(/core profile field/i);
    }
  });
});

describe("validateFollowupRuleForm", () => {
  it("accepts the same operators as the core engine", () => {
    const result = validateFollowupRuleForm({
      question_id: "11111111-1111-4111-8111-111111111111",
      operator: "equals",
      expected_value: '"yes"',
      required: true,
      explanation: "Must be yes.",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects an unknown operator", () => {
    const result = validateFollowupRuleForm({
      question_id: "11111111-1111-4111-8111-111111111111",
      operator: "kinda_matches",
      expected_value: '"yes"',
      required: true,
      explanation: "",
    });
    expect(result.ok).toBe(false);
  });
});
