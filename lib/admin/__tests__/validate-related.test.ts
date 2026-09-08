import { describe, expect, it } from "vitest";
import {
  parseRuleJsonValue,
  validateLocationForm,
  validateRuleForm,
  validateSourceForm,
} from "@/lib/admin/validate-related";

describe("parseRuleJsonValue", () => {
  it("accepts empty values as null and well-formed JSON", () => {
    expect(parseRuleJsonValue("")).toEqual({ ok: true, value: null });
    expect(parseRuleJsonValue("  ")).toEqual({ ok: true, value: null });
    expect(parseRuleJsonValue("true")).toEqual({ ok: true, value: true });
    expect(parseRuleJsonValue("42000")).toEqual({ ok: true, value: 42000 });
    expect(parseRuleJsonValue('["owner","renter"]')).toEqual({
      ok: true,
      value: ["owner", "renter"],
    });
  });

  it("rejects malformed JSON", () => {
    expect(parseRuleJsonValue("{")).toEqual({
      ok: false,
      error: "Rule value must be valid JSON.",
    });
    expect(parseRuleJsonValue("undefined")).toEqual({
      ok: false,
      error: "Rule value must be valid JSON.",
    });
    expect(parseRuleJsonValue("not json")).toEqual({
      ok: false,
      error: "Rule value must be valid JSON.",
    });
    expect(parseRuleJsonValue("{'owner': true}").ok).toBe(false);
  });
});

describe("validateRuleForm", () => {
  it("rejects malformed JSON on the full rule form", () => {
    const result = validateRuleForm({
      field: "household_income",
      operator: "less_than_or_equal",
      value: "{bad",
      rule_group: "1",
      group_operator: "AND",
      required: true,
      explanation: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.value).toMatch(/valid JSON/i);
    }
  });

  it("accepts a valid rule", () => {
    const result = validateRuleForm({
      field: "household_income",
      operator: "less_than_or_equal",
      value: "80000",
      rule_group: "1",
      group_operator: "AND",
      required: true,
      explanation: "Income at or below 80,000",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.field).toBe("household_income");
      expect(result.data.value).toBe(80000);
    }
  });

  it("rejects an unknown or misspelled field", () => {
    const result = validateRuleForm({
      field: "household_incomme",
      operator: "less_than_or_equal",
      value: "80000",
      rule_group: "1",
      group_operator: "AND",
      required: true,
      explanation: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.field).toMatch(/unknown field/i);
    }
  });
});

describe("validateLocationForm and validateSourceForm", () => {
  it("rejects an invalid location type", () => {
    const result = validateLocationForm({
      location_type: "NEIGHBORHOOD",
      location_value: "Pacoima",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a missing or invalid source URL", () => {
    expect(
      validateSourceForm({
        source_type: "ELIGIBILITY",
        organization: "CARB",
        url: "",
        verified_at: "",
        notes: "",
      }).ok,
    ).toBe(false);
    const result = validateSourceForm({
      source_type: "ELIGIBILITY",
      organization: "CARB",
      url: "example.com",
      verified_at: "",
      notes: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.url).toMatch(/http/i);
    }
  });
});
