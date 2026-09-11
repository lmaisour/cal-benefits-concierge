import { parseRuleJsonValue } from "@/lib/admin/validate-related";
import type { FieldErrors } from "@/lib/admin/validate-program";
import { isUserProfileField } from "@/lib/eligibility/values";
import {
  FOLLOWUP_ANSWER_TYPES,
  RULE_OPERATORS,
  type FollowupAnswerType,
  type Json,
  type ProgramFollowupQuestionInsert,
  type ProgramFollowupRuleInsert,
  type RuleOperator,
} from "@/types/database";

export type FollowupQuestionFormValues = {
  question_key: string;
  question: string;
  help_text: string;
  answer_type: string;
  options: string;
  sort_order: string;
  required: boolean;
  display_when_field: string;
  display_when_operator: string;
  display_when_value: string;
  active: boolean;
  cta_label: string;
};

export type FollowupRuleFormValues = {
  question_id: string;
  operator: string;
  expected_value: string;
  required: boolean;
  explanation: string;
};

export type FollowupQuestionValidationResult =
  | { ok: true; data: Omit<ProgramFollowupQuestionInsert, "program_id"> }
  | { ok: false; errors: FieldErrors };

export type FollowupRuleValidationResult =
  | { ok: true; data: Omit<ProgramFollowupRuleInsert, "program_id"> }
  | { ok: false; errors: FieldErrors };

export function validateFollowupQuestionForm(
  values: FollowupQuestionFormValues,
): FollowupQuestionValidationResult {
  const errors: FieldErrors = {};
  const questionKey = values.question_key.trim();
  if (!questionKey) {
    errors.question_key = "Question key is required.";
  } else if (!/^[a-z][a-z0-9_]*$/.test(questionKey)) {
    errors.question_key = "Use a lowercase key such as front_yard_grass_size.";
  }

  const question = values.question.trim();
  if (!question) {
    errors.question = "Question text is required.";
  }

  if (!isFollowupAnswerType(values.answer_type)) {
    errors.answer_type = "Select a valid answer type.";
  }

  const options = parseRuleJsonValue(values.options || "[]");
  if (options.ok === false) {
    errors.options = options.error;
  } else if (!Array.isArray(options.value)) {
    errors.options = "Options must be a JSON array.";
  }

  const sortOrder = parseNonNegativeInt(values.sort_order);
  if (sortOrder.ok === false) {
    errors.sort_order = sortOrder.error;
  }

  const displayField = emptyToNull(values.display_when_field);
  const displayOperator = emptyToNull(values.display_when_operator);
  if (displayField && !isUserProfileField(displayField)) {
    errors.display_when_field = "Display conditions must use a core profile field.";
  }
  if (displayOperator && !isRuleOperator(displayOperator)) {
    errors.display_when_operator = "Select a valid operator.";
  }
  if ((displayField && !displayOperator) || (!displayField && displayOperator)) {
    errors.display_when_field = "Display field and operator must be set together.";
  }

  const displayValue = parseRuleJsonValue(values.display_when_value);
  if (displayValue.ok === false) {
    errors.display_when_value = displayValue.error;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      question_key: questionKey,
      question,
      help_text: emptyToNull(values.help_text),
      answer_type: values.answer_type as FollowupAnswerType,
      options: (options.ok ? options.value : []) as Json,
      sort_order: sortOrder.ok ? sortOrder.value : 0,
      required: values.required,
      display_when_field: displayField,
      display_when_operator: displayOperator as RuleOperator | null,
      display_when_value: displayValue.ok ? displayValue.value : null,
      active: values.active,
      cta_label: emptyToNull(values.cta_label),
    },
  };
}

export function validateFollowupRuleForm(
  values: FollowupRuleFormValues,
): FollowupRuleValidationResult {
  const errors: FieldErrors = {};
  if (!values.question_id.trim()) {
    errors.question_id = "Select a question.";
  }
  if (!isRuleOperator(values.operator)) {
    errors.operator = "Select a valid operator.";
  }
  const expected = parseRuleJsonValue(values.expected_value);
  if (expected.ok === false) {
    errors.expected_value = expected.error;
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    data: {
      question_id: values.question_id.trim(),
      operator: values.operator as RuleOperator,
      expected_value: expected.ok ? expected.value : null,
      required: values.required,
      explanation: emptyToNull(values.explanation),
    },
  };
}

export function followupQuestionFormFromData(formData: FormData): FollowupQuestionFormValues {
  return {
    question_key: readString(formData, "question_key"),
    question: readString(formData, "question"),
    help_text: readString(formData, "help_text"),
    answer_type: readString(formData, "answer_type") || "single_choice",
    options: readString(formData, "options"),
    sort_order: readString(formData, "sort_order") || "0",
    required: formData.get("required") === "true",
    display_when_field: readString(formData, "display_when_field"),
    display_when_operator: readString(formData, "display_when_operator"),
    display_when_value: readString(formData, "display_when_value"),
    active: formData.get("active") === "true",
    cta_label: readString(formData, "cta_label"),
  };
}

export function followupRuleFormFromData(formData: FormData): FollowupRuleFormValues {
  return {
    question_id: readString(formData, "question_id"),
    operator: readString(formData, "operator") || "equals",
    expected_value: readString(formData, "expected_value"),
    required: formData.get("required") === "true",
    explanation: readString(formData, "explanation"),
  };
}

function parseNonNegativeInt(
  raw: string,
): { ok: true; value: number } | { ok: false; error: string } {
  const trimmed = raw.trim() || "0";
  if (!/^[0-9]+$/.test(trimmed)) {
    return { ok: false, error: "Sort order must be a whole number." };
  }
  return { ok: true, value: Number(trimmed) };
}

function isFollowupAnswerType(value: string): value is FollowupAnswerType {
  return (FOLLOWUP_ANSWER_TYPES as readonly string[]).includes(value);
}

function isRuleOperator(value: string): value is RuleOperator {
  return (RULE_OPERATORS as readonly string[]).includes(value);
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
