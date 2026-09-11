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

export const FOLLOWUP_QUESTION_SCOPE_ERROR =
  "Select a question that belongs to this program.";

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

export type FollowupOptionObject = {
  value: string;
  label: string;
  unknown?: boolean;
};

export function isFollowupQuestionOnProgram(
  question: { program_id: string } | null | undefined,
  programId: string,
): boolean {
  return question != null && question.program_id === programId;
}

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

  const parsedOptions = parseRuleJsonValue(values.options || "[]");
  let options: Json = [];
  if (parsedOptions.ok === false) {
    errors.options = parsedOptions.error;
  } else if (values.answer_type === "single_choice" || !errors.answer_type) {
    const validated = validateSingleChoiceOptions(parsedOptions.value);
    if (validated.ok === false) {
      errors.options = validated.error;
    } else {
      options = validated.value as Json;
    }
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
      options,
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

export function validateSingleChoiceOptions(
  raw: Json | null,
): { ok: true; value: FollowupOptionObject[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: "Add at least one option with a value and label." };
  }

  const options: FollowupOptionObject[] = [];
  const seen = new Set<string>();

  for (const [index, item] of raw.entries()) {
    const position = index + 1;
    if (!isPlainObject(item)) {
      return { ok: false, error: `Option ${position} must be an object with value and label.` };
    }
    if (typeof item.value !== "string" || item.value.trim() === "") {
      return { ok: false, error: `Option ${position} needs a nonblank string value.` };
    }
    if (typeof item.label !== "string" || item.label.trim() === "") {
      return { ok: false, error: `Option ${position} needs a nonblank string label.` };
    }
    if (item.unknown !== undefined && typeof item.unknown !== "boolean") {
      return { ok: false, error: `Option ${position} unknown must be a boolean when set.` };
    }

    const value = item.value.trim();
    if (seen.has(value)) {
      return { ok: false, error: "Option values must be unique." };
    }
    seen.add(value);

    const option: FollowupOptionObject = {
      value,
      label: item.label.trim(),
    };
    if (item.unknown === true || item.unknown === false) {
      option.unknown = item.unknown;
    }
    options.push(option);
  }

  return { ok: true, value: options };
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
