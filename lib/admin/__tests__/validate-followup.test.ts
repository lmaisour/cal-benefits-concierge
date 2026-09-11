import { describe, expect, it } from "vitest";
import {
  validateFollowupQuestionForm,
  validateFollowupRuleForm,
  validateSingleChoiceOptions,
} from "@/lib/admin/validate-followup";

const validQuestion = {
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
};

describe("validateFollowupQuestionForm", () => {
  it("accepts a well-formed single-choice question", () => {
    const result = validateFollowupQuestionForm(validQuestion);
    expect(result.ok).toBe(true);
  });

  it("rejects a UserProfile field used as a display condition incorrectly", () => {
    const result = validateFollowupQuestionForm({
      ...validQuestion,
      question_key: "property_owner_permission",
      question: "Can you get written permission?",
      display_when_field: "not_a_profile_field",
      display_when_operator: "not_equals",
      display_when_value: '"owner"',
      cta_label: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.display_when_field).toMatch(/core profile field/i);
    }
  });
});

describe("single_choice options", () => {
  it("accepts valid options including optional unknown booleans", () => {
    const result = validateSingleChoiceOptions([
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "not_sure", label: "Not sure", unknown: true },
    ]);
    expect(result).toEqual({
      ok: true,
      value: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
        { value: "not_sure", label: "Not sure", unknown: true },
      ],
    });
  });

  it("rejects an empty options array", () => {
    const result = validateFollowupQuestionForm({
      ...validQuestion,
      options: "[]",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.options).toMatch(/at least one option/i);
    }
  });

  it("rejects a malformed option that is not an object", () => {
    const result = validateFollowupQuestionForm({
      ...validQuestion,
      options: '[{"value":"yes","label":"Yes"},"no"]',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.options).toMatch(/object/i);
    }
  });

  it("rejects a blank value or label", () => {
    const blankValue = validateFollowupQuestionForm({
      ...validQuestion,
      options: '[{"value":"  ","label":"Yes"}]',
    });
    expect(blankValue.ok).toBe(false);
    if (!blankValue.ok) {
      expect(blankValue.errors.options).toMatch(/value/i);
    }

    const blankLabel = validateFollowupQuestionForm({
      ...validQuestion,
      options: '[{"value":"yes","label":""}]',
    });
    expect(blankLabel.ok).toBe(false);
    if (!blankLabel.ok) {
      expect(blankLabel.errors.options).toMatch(/label/i);
    }
  });

  it("rejects duplicate values", () => {
    const result = validateFollowupQuestionForm({
      ...validQuestion,
      options: '[{"value":"yes","label":"Yes"},{"value":"yes","label":"Yep"}]',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.options).toMatch(/unique/i);
    }
  });

  it("rejects a non-boolean unknown flag", () => {
    const result = validateFollowupQuestionForm({
      ...validQuestion,
      options: '[{"value":"yes","label":"Yes","unknown":"true"}]',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.options).toMatch(/boolean/i);
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
