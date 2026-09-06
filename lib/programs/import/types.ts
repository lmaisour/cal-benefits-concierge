import type {
  BenefitType,
  Confidence,
  Json,
  LocationType,
  ProgramStatus,
  RelationshipType,
  RuleGroupOperator,
  RuleOperator,
  SourceType,
} from "@/types/database";

export const CATALOG_CATEGORIES = [
  "vehicles",
  "home-energy",
  "utilities",
  "housing",
  "water",
  "family",
  "food",
  "communications",
  "taxes",
] as const;

export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number];

export type CatalogProgram = {
  external_id: string;
  name: string;
  slug: string;
  administrator: string | null;
  category: CatalogCategory;
  subcategory: string | null;
  short_description: string | null;
  description: string | null;
  benefit_summary: string | null;
  benefit_type: BenefitType;
  benefit_min: number | null;
  benefit_max: number | null;
  benefit_period: string | null;
  status: ProgramStatus;
  official_url: string;
  application_url: string | null;
  statewide: boolean;
  preapproval_required: boolean | null;
  purchase_before_approval_allowed: boolean | null;
  effective_start: string | null;
  effective_end: string | null;
  last_verified_at: string;
  confidence: Confidence;
  featured: boolean;
  active: boolean;
};

export type CatalogRule = {
  program_external_id: string;
  field: string;
  operator: RuleOperator;
  value: Json | null;
  rule_group: number;
  group_operator: RuleGroupOperator;
  required: boolean;
  explanation: string | null;
};

export type CatalogLocation = {
  program_external_id: string;
  location_type: LocationType;
  location_value: string;
};

export type CatalogSource = {
  program_external_id: string;
  source_type: SourceType;
  organization: string | null;
  url: string;
  verified_at: string;
  notes: string | null;
};

export type CatalogRelationship = {
  program_a_external_id: string;
  program_b_external_id: string;
  relationship_type: RelationshipType;
  notes: string | null;
};

export type ProgramCatalog = {
  programs: CatalogProgram[];
  rules: CatalogRule[];
  locations: CatalogLocation[];
  sources: CatalogSource[];
  relationships: CatalogRelationship[];
};
