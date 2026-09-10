export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export const PROGRAM_STATUSES = [
  "ACTIVE",
  "WAITLIST",
  "PAUSED",
  "FUNDING_EXHAUSTED",
  "UPCOMING",
  "EXPIRED",
  "UNCERTAIN",
] as const;

export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

export const BENEFIT_TYPES = [
  "CASH",
  "REBATE",
  "TAX_CREDIT",
  "BILL_SAVINGS",
  "FREE_SERVICE",
  "FREE_PRODUCT",
  "FORGIVABLE_LOAN",
  "LOAN",
  "FINANCING",
  "OTHER",
] as const;

export type BenefitType = (typeof BENEFIT_TYPES)[number];

export const CONFIDENCE_LEVELS = ["HIGH", "MEDIUM", "LOW"] as const;

export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export const RULE_OPERATORS = [
  "equals",
  "not_equals",
  "greater_than",
  "greater_than_or_equal",
  "less_than",
  "less_than_or_equal",
  "in",
  "not_in",
  "contains",
  "is_true",
  "is_false",
  "exists",
  "not_exists",
] as const;

export type RuleOperator = (typeof RULE_OPERATORS)[number];

export const RULE_GROUP_OPERATORS = ["AND", "OR"] as const;

export type RuleGroupOperator = (typeof RULE_GROUP_OPERATORS)[number];

export const LOCATION_TYPES = [
  "STATE",
  "COUNTY",
  "CITY",
  "ZIP",
  "ELECTRIC_UTILITY",
  "GAS_UTILITY",
] as const;

export type LocationType = (typeof LOCATION_TYPES)[number];

export const SOURCE_TYPES = [
  "ELIGIBILITY",
  "BENEFIT",
  "STATUS",
  "APPLICATION",
  "GEOGRAPHY",
  "STACKING",
  "GENERAL",
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export const RELATIONSHIP_TYPES = [
  "STACKABLE",
  "CONDITIONALLY_STACKABLE",
  "MUTUALLY_EXCLUSIVE",
  "UNKNOWN",
  "REQUIRES_SEQUENCE",
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export type ProgramRow = {
  id: string;
  external_id: string | null;
  name: string;
  slug: string;
  administrator: string | null;
  category: string;
  subcategory: string | null;
  short_description: string | null;
  description: string | null;
  benefit_summary: string | null;
  benefit_type: BenefitType;
  benefit_min: number | null;
  benefit_max: number | null;
  benefit_period: string | null;
  status: ProgramStatus;
  official_url: string | null;
  application_url: string | null;
  statewide: boolean;
  preapproval_required: boolean | null;
  purchase_before_approval_allowed: boolean | null;
  effective_start: string | null;
  effective_end: string | null;
  last_verified_at: string | null;
  confidence: Confidence | null;
  featured: boolean;
  active: boolean;
  has_unmodeled_required_criteria: boolean;
  unmodeled_required_criteria_summary: string | null;
  created_at: string;
  updated_at: string;
};

export type ProgramRuleRow = {
  id: string;
  program_id: string;
  field: string;
  operator: RuleOperator;
  value: Json | null;
  rule_group: number;
  group_operator: RuleGroupOperator;
  required: boolean;
  explanation: string | null;
  created_at: string;
};

export type ProgramLocationRow = {
  id: string;
  program_id: string;
  location_type: LocationType;
  location_value: string;
  created_at: string;
};

export type ProgramSourceRow = {
  id: string;
  program_id: string;
  source_type: SourceType;
  organization: string | null;
  url: string;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
};

export type ProgramRelationshipRow = {
  id: string;
  program_a_id: string;
  program_b_id: string;
  relationship_type: RelationshipType;
  notes: string | null;
  created_at: string;
};

/**
 * Insert shapes: only NOT NULL columns without a database default are required.
 * Defaults (id, timestamps, statewide, featured, active, rule_group, …)
 * and nullable columns may be omitted.
 */
export type ProgramInsert = Pick<
  ProgramRow,
  "name" | "slug" | "category" | "benefit_type" | "status"
> &
  Partial<Omit<ProgramRow, "name" | "slug" | "category" | "benefit_type" | "status">>;

export type ProgramRuleInsert = Pick<
  ProgramRuleRow,
  "program_id" | "field" | "operator"
> &
  Partial<Omit<ProgramRuleRow, "program_id" | "field" | "operator">>;

export type ProgramLocationInsert = Pick<
  ProgramLocationRow,
  "program_id" | "location_type" | "location_value"
> &
  Partial<Omit<ProgramLocationRow, "program_id" | "location_type" | "location_value">>;

export type ProgramSourceInsert = Pick<
  ProgramSourceRow,
  "program_id" | "source_type" | "url"
> &
  Partial<Omit<ProgramSourceRow, "program_id" | "source_type" | "url">>;

export type ProgramRelationshipInsert = Pick<
  ProgramRelationshipRow,
  "program_a_id" | "program_b_id" | "relationship_type"
> &
  Partial<
    Omit<ProgramRelationshipRow, "program_a_id" | "program_b_id" | "relationship_type">
  >;

export type ProgramContentRow = {
  program_id: string;
  seo_title: string | null;
  meta_description: string | null;
  overview: string | null;
  benefit_explanation: string | null;
  how_to_apply: string | null;
  documents_needed: string | null;
  important_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProgramContentInsert = Pick<ProgramContentRow, "program_id"> &
  Partial<Omit<ProgramContentRow, "program_id">>;

export type ProgramFaqRow = {
  id: string;
  program_id: string;
  question: string;
  answer: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ProgramFaqInsert = Pick<ProgramFaqRow, "program_id" | "question" | "answer"> &
  Partial<Omit<ProgramFaqRow, "program_id" | "question" | "answer">>;

export type GuideRow = {
  id: string;
  title: string;
  slug: string;
  seo_title: string | null;
  meta_description: string | null;
  excerpt: string | null;
  body: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GuideInsert = Pick<GuideRow, "title" | "slug"> &
  Partial<Omit<GuideRow, "title" | "slug">>;

export type GuideProgramRow = {
  guide_id: string;
  program_id: string;
  created_at: string;
};

export type GuideProgramInsert = Pick<GuideProgramRow, "guide_id" | "program_id"> &
  Partial<Omit<GuideProgramRow, "guide_id" | "program_id">>;

export type HomepageFeatureRow = {
  program_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type HomepageFeatureInsert = Pick<HomepageFeatureRow, "program_id"> &
  Partial<Omit<HomepageFeatureRow, "program_id">>;

export const CONTENT_BRIEF_TYPES = ["PROGRAM", "GUIDE"] as const;

export type ContentBriefType = (typeof CONTENT_BRIEF_TYPES)[number];

export const DEFAULT_SEO_PROVIDER = "manual";

export type ContentBriefRow = {
  id: string;
  content_type: ContentBriefType;
  program_id: string | null;
  guide_id: string | null;
  primary_keyword: string | null;
  secondary_keywords: string[];
  search_intent: string | null;
  questions_to_answer: string[];
  topics_to_cover: string[];
  suggested_title: string | null;
  suggested_meta_description: string | null;
  competitor_notes: string | null;
  research_notes: string | null;
  seo_provider: string;
  provider_document_id: string | null;
  provider_score: number | null;
  researched_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentBriefInsert = Pick<ContentBriefRow, "content_type"> &
  Partial<Omit<ContentBriefRow, "content_type">>;

export type ContentEvidenceRow = {
  id: string;
  program_id: string;
  content_section: string;
  claim: string;
  source_url: string;
  source_title: string | null;
  source_publisher: string | null;
  source_date: string | null;
  verified_at: string | null;
  confidence: Confidence;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentEvidenceInsert = Pick<
  ContentEvidenceRow,
  "program_id" | "content_section" | "claim" | "source_url" | "confidence"
> &
  Partial<
    Omit<
      ContentEvidenceRow,
      "program_id" | "content_section" | "claim" | "source_url" | "confidence"
    >
  >;

export type Database = {
  public: {
    Tables: {
      programs: {
        Row: ProgramRow;
        Insert: ProgramInsert;
        Update: Partial<ProgramRow>;
        Relationships: [];
      };
      program_rules: {
        Row: ProgramRuleRow;
        Insert: ProgramRuleInsert;
        Update: Partial<ProgramRuleRow>;
        Relationships: [];
      };
      program_locations: {
        Row: ProgramLocationRow;
        Insert: ProgramLocationInsert;
        Update: Partial<ProgramLocationRow>;
        Relationships: [];
      };
      program_sources: {
        Row: ProgramSourceRow;
        Insert: ProgramSourceInsert;
        Update: Partial<ProgramSourceRow>;
        Relationships: [];
      };
      program_relationships: {
        Row: ProgramRelationshipRow;
        Insert: ProgramRelationshipInsert;
        Update: Partial<ProgramRelationshipRow>;
        Relationships: [];
      };
      program_content: {
        Row: ProgramContentRow;
        Insert: ProgramContentInsert;
        Update: Partial<ProgramContentRow>;
        Relationships: [];
      };
      program_faqs: {
        Row: ProgramFaqRow;
        Insert: ProgramFaqInsert;
        Update: Partial<ProgramFaqRow>;
        Relationships: [];
      };
      guides: {
        Row: GuideRow;
        Insert: GuideInsert;
        Update: Partial<GuideRow>;
        Relationships: [];
      };
      guide_programs: {
        Row: GuideProgramRow;
        Insert: GuideProgramInsert;
        Update: Partial<GuideProgramRow>;
        Relationships: [];
      };
      homepage_features: {
        Row: HomepageFeatureRow;
        Insert: HomepageFeatureInsert;
        Update: Partial<HomepageFeatureRow>;
        Relationships: [];
      };
      content_briefs: {
        Row: ContentBriefRow;
        Insert: ContentBriefInsert;
        Update: Partial<ContentBriefRow>;
        Relationships: [];
      };
      content_evidence: {
        Row: ContentEvidenceRow;
        Insert: ContentEvidenceInsert;
        Update: Partial<ContentEvidenceRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    // Constrained values are TEXT + CHECK in SQL, not PostgreSQL enum types.
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
