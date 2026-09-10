import { parseOptionalNumber, type FieldErrors } from "@/lib/admin/validate-program";

export type FaqFormValues = {
  question: string;
  answer: string;
  sort_order: string;
};

export type FaqWritePayload = {
  question: string;
  answer: string;
  sort_order: number;
};

export type FaqValidationResult =
  | { ok: true; data: FaqWritePayload }
  | { ok: false; errors: FieldErrors };

export function emptyFaqFormValues(): FaqFormValues {
  return { question: "", answer: "", sort_order: "0" };
}

export function faqFormFromData(formData: FormData): FaqFormValues {
  return {
    question: readString(formData, "question"),
    answer: readString(formData, "answer"),
    sort_order: readString(formData, "sort_order") || "0",
  };
}

export function validateFaqForm(values: FaqFormValues): FaqValidationResult {
  const errors: FieldErrors = {};
  const question = values.question.trim();
  const answer = values.answer.trim();

  if (!question) {
    errors.question = "Question is required.";
  }
  if (!answer) {
    errors.answer = "Answer is required.";
  }

  const sortOrder = parseOptionalNumber(values.sort_order);
  if (!sortOrder.ok || sortOrder.value === null) {
    errors.sort_order = "Enter a display order number.";
  } else if (!Number.isInteger(sortOrder.value)) {
    errors.sort_order = "Display order must be a whole number.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      question,
      answer,
      sort_order: sortOrder.ok && sortOrder.value !== null ? sortOrder.value : 0,
    },
  };
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
