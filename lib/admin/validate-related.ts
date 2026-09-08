import {
  LOCATION_TYPES,
  RULE_GROUP_OPERATORS,
  RULE_OPERATORS,
  SOURCE_TYPES,
  type Json,
  type LocationType,
  type ProgramLocationInsert,
  type ProgramRuleInsert,
  type ProgramSourceInsert,
  type RuleGroupOperator,
  type RuleOperator,
  type SourceType,
} from "@/types/database";
import { isUserProfileField } from "@/lib/eligibility/values";
import { parseOptionalUrl, type FieldErrors } from "@/lib/admin/validate-program";

export type RuleFormValues = {
  field: string;
  operator: string;
  value: string;
  rule_group: string;
  group_operator: string;
  required: boolean;
  explanation: string;
};

export type LocationFormValues = {
  location_type: string;
  location_value: string;
};

export type SourceFormValues = {
  source_type: string;
  organization: string;
  url: string;
  verified_at: string;
  notes: string;
};

export type RuleValidationResult =
  | { ok: true; data: Omit<ProgramRuleInsert, "program_id"> }
  | { ok: false; errors: FieldErrors };

export type LocationValidationResult =
  | { ok: true; data: Omit<ProgramLocationInsert, "program_id"> }
  | { ok: false; errors: FieldErrors };

export type SourceValidationResult =
  | { ok: true; data: Omit<ProgramSourceInsert, "program_id"> }
  | { ok: false; errors: FieldErrors };

export function parseRuleJsonValue(
  raw: string,
): { ok: true; value: Json | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, value: null };
  }
  try {
    return { ok: true, value: JSON.parse(trimmed) as Json };
  } catch {
    return { ok: false, error: "Rule value must be valid JSON." };
  }
}

export function validateRuleForm(values: RuleFormValues): RuleValidationResult {
  const errors: FieldErrors = {};
  const field = values.field.trim();
  if (!field) {
    errors.field = "Field is required.";
  } else if (!isUserProfileField(field)) {
    errors.field =
      "Unknown field. Use a questionnaire profile field such as household_income.";
  }

  if (!isRuleOperator(values.operator)) {
    errors.operator = "Select a valid operator.";
  }

  const parsedValue = parseRuleJsonValue(values.value);
  if (parsedValue.ok === false) {
    errors.value = parsedValue.error;
  }

  const ruleGroup = parseRuleGroup(values.rule_group);
  if (ruleGroup.ok === false) {
    errors.rule_group = ruleGroup.error;
  }

  if (!isGroupOperator(values.group_operator)) {
    errors.group_operator = "Select AND or OR.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      field,
      operator: values.operator as RuleOperator,
      value: parsedValue.ok ? parsedValue.value : null,
      rule_group: ruleGroup.ok ? ruleGroup.value : 1,
      group_operator: values.group_operator as RuleGroupOperator,
      required: values.required,
      explanation: emptyToNull(values.explanation),
    },
  };
}

export function validateLocationForm(
  values: LocationFormValues,
): LocationValidationResult {
  const errors: FieldErrors = {};
  if (!isLocationType(values.location_type)) {
    errors.location_type = "Select a valid location type.";
  }
  const locationValue = values.location_value.trim();
  if (!locationValue) {
    errors.location_value = "Location value is required.";
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    data: {
      location_type: values.location_type as LocationType,
      location_value: locationValue,
    },
  };
}

export function validateSourceForm(
  values: SourceFormValues,
): SourceValidationResult {
  const errors: FieldErrors = {};
  if (!isSourceType(values.source_type)) {
    errors.source_type = "Select a valid source type.";
  }

  const url = parseOptionalUrl(values.url);
  if (url.ok === false) {
    errors.url = url.error;
  } else if (url.value === null) {
    errors.url = "URL is required.";
  }

  const verifiedAt = parseOptionalTimestamp(values.verified_at);
  if (verifiedAt.ok === false) {
    errors.verified_at = verifiedAt.error;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      source_type: values.source_type as SourceType,
      organization: emptyToNull(values.organization),
      url: url.ok && url.value ? url.value : "",
      verified_at: verifiedAt.ok ? verifiedAt.value : null,
      notes: emptyToNull(values.notes),
    },
  };
}

export function ruleFormFromData(formData: FormData): RuleFormValues {
  return {
    field: readString(formData, "field"),
    operator: readString(formData, "operator"),
    value: readString(formData, "value"),
    rule_group: readString(formData, "rule_group"),
    group_operator: readString(formData, "group_operator") || "AND",
    required: formData.get("required") === "true",
    explanation: readString(formData, "explanation"),
  };
}

export function locationFormFromData(formData: FormData): LocationFormValues {
  return {
    location_type: readString(formData, "location_type"),
    location_value: readString(formData, "location_value"),
  };
}

export function sourceFormFromData(formData: FormData): SourceFormValues {
  return {
    source_type: readString(formData, "source_type"),
    organization: readString(formData, "organization"),
    url: readString(formData, "url"),
    verified_at: readString(formData, "verified_at"),
    notes: readString(formData, "notes"),
  };
}

function parseRuleGroup(
  raw: string,
): { ok: true; value: number } | { ok: false; error: string } {
  const trimmed = raw.trim() || "1";
  if (!/^[0-9]+$/.test(trimmed)) {
    return { ok: false, error: "Rule group must be a whole number." };
  }
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 1) {
    return { ok: false, error: "Rule group must be 1 or greater." };
  }
  return { ok: true, value };
}

function parseOptionalTimestamp(
  raw: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, value: null };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = Date.parse(`${trimmed}T00:00:00.000Z`);
    if (Number.isNaN(parsed)) {
      return { ok: false, error: "Enter a valid date." };
    }
    return { ok: true, value: new Date(parsed).toISOString() };
  }
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    return { ok: false, error: "Enter a valid date." };
  }
  return { ok: true, value: new Date(parsed).toISOString() };
}

function isRuleOperator(value: string): value is RuleOperator {
  return (RULE_OPERATORS as readonly string[]).includes(value);
}

function isGroupOperator(value: string): value is RuleGroupOperator {
  return (RULE_GROUP_OPERATORS as readonly string[]).includes(value);
}

function isLocationType(value: string): value is LocationType {
  return (LOCATION_TYPES as readonly string[]).includes(value);
}

function isSourceType(value: string): value is SourceType {
  return (SOURCE_TYPES as readonly string[]).includes(value);
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
