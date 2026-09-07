import type {
  CatalogLocation,
  CatalogProgram,
  CatalogRule,
  CatalogSource,
} from "@/lib/programs/import/types";
import type {
  BenefitType,
  Confidence,
  Json,
  LocationType,
  ProgramStatus,
  RuleOperator,
  SourceType,
} from "@/types/database";
import type { CatalogCategory } from "@/lib/programs/import/types";

export const VERIFIED_AT = "2026-09-06T00:00:00Z";
export const VERIFIED_7C_AT = "2026-09-07T00:00:00Z";

export function program(
  input: Omit<
    CatalogProgram,
    | "featured"
    | "last_verified_at"
    | "has_unmodeled_required_criteria"
    | "unmodeled_required_criteria_summary"
  > & {
    featured?: boolean;
    last_verified_at?: string;
    has_unmodeled_required_criteria?: boolean;
    unmodeled_required_criteria_summary?: string | null;
  },
): CatalogProgram {
  return {
    featured: false,
    last_verified_at: VERIFIED_AT,
    has_unmodeled_required_criteria: false,
    unmodeled_required_criteria_summary: null,
    ...input,
  };
}

export function src(
  programExternalId: string,
  sourceType: SourceType,
  organization: string,
  url: string,
  notes: string | null = null,
  verifiedAt: string = VERIFIED_AT,
): CatalogSource {
  return {
    program_external_id: programExternalId,
    source_type: sourceType,
    organization,
    url,
    verified_at: verifiedAt,
    notes,
  };
}

export function rule(
  programExternalId: string,
  field: string,
  operator: RuleOperator,
  value: Json | null,
  explanation: string,
  extras: Partial<Pick<CatalogRule, "rule_group" | "group_operator" | "required">> = {},
): CatalogRule {
  return {
    program_external_id: programExternalId,
    field,
    operator,
    value,
    rule_group: extras.rule_group ?? 1,
    group_operator: extras.group_operator ?? "AND",
    required: extras.required ?? true,
    explanation,
  };
}

export function loc(
  programExternalId: string,
  locationType: LocationType,
  locationValue: string,
): CatalogLocation {
  return {
    program_external_id: programExternalId,
    location_type: locationType,
    location_value: locationValue,
  };
}

export function stateCa(programExternalId: string): CatalogLocation {
  return loc(programExternalId, "STATE", "CA");
}

export type Draft = {
  program: CatalogProgram;
  sources: CatalogSource[];
  rules?: CatalogRule[];
  locations?: CatalogLocation[];
};

export function pack(drafts: Draft[]): {
  programs: CatalogProgram[];
  sources: CatalogSource[];
  rules: CatalogRule[];
  locations: CatalogLocation[];
} {
  return {
    programs: drafts.map((draft) => draft.program),
    sources: drafts.flatMap((draft) => draft.sources),
    rules: drafts.flatMap((draft) => draft.rules ?? []),
    locations: drafts.flatMap((draft) => draft.locations ?? [stateCa(draft.program.external_id)]),
  };
}

export type { BenefitType, CatalogCategory, Confidence, ProgramStatus };
