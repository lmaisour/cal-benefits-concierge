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

export const BENEFIT_AMOUNT_STRUCTURES = [
  "SINGLE",
  "RANGE",
  "TIERED",
  "UNKNOWN",
] as const;

export type BenefitAmountStructure = (typeof BENEFIT_AMOUNT_STRUCTURES)[number];

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
  "less_than_or_equal_by_household_size",
] as const;

export type RuleOperator = (typeof RULE_OPERATORS)[number];

export const FOLLOWUP_ANSWER_TYPES = ["single_choice"] as const;

export type FollowupAnswerType = (typeof FOLLOWUP_ANSWER_TYPES)[number];

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
  consumer_headline: string | null;
  administrator_display_name: string | null;
  consumer_tags: string[] | null;
  category: string;
  subcategory: string | null;
  short_description: string | null;
  description: string | null;
  benefit_summary: string | null;
  benefit_type: BenefitType;
  benefit_min: number | null;
  benefit_max: number | null;
  benefit_period: string | null;
  benefit_amount_structure?: BenefitAmountStructure | null;
  status: ProgramStatus;
  official_url: string | null;
  application_url: string | null;
  statewide: boolean;
  preapproval_required: boolean | null;
  purchase_before_approval_allowed: boolean | null;
  effective_start: string | null;
  effective_end: string | null;
  application_deadline: string | null;
  last_verified_at: string | null;
  confidence: Confidence | null;
  featured: boolean;
  active: boolean;
  has_unmodeled_required_criteria: boolean;
  unmodeled_required_criteria_summary: string | null;
  created_at: string;
  updated_at: string;
};

export type ProgramBenefitTierRow = {
  id: string;
  program_id: string;
  amount: number | null;
  label: string;
  condition_summary: string;
  sort_order: number;
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

export type ProgramFollowupQuestionRow = {
  id: string;
  program_id: string;
  question_key: string;
  question: string;
  help_text: string | null;
  answer_type: FollowupAnswerType;
  options: Json;
  sort_order: number;
  required: boolean;
  display_when_field: string | null;
  display_when_operator: RuleOperator | null;
  display_when_value: Json | null;
  active: boolean;
  cta_label: string | null;
  created_at: string;
  updated_at: string;
};

export type ProgramFollowupRuleRow = {
  id: string;
  program_id: string;
  question_id: string;
  operator: RuleOperator;
  expected_value: Json | null;
  required: boolean;
  explanation: string | null;
  /**
   * When set, this required follow-up is an OR alternative for the matching
   * core `program_rules.rule_group`. Null keeps the follow-up as an
   * independent AND requirement.
   */
  satisfies_rule_group: number | null;
  created_at: string;
  updated_at: string;
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

export type ProgramFollowupQuestionInsert = Pick<
  ProgramFollowupQuestionRow,
  "program_id" | "question_key" | "question"
> &
  Partial<Omit<ProgramFollowupQuestionRow, "program_id" | "question_key" | "question">>;

export type ProgramFollowupRuleInsert = Pick<
  ProgramFollowupRuleRow,
  "program_id" | "question_id" | "operator"
> &
  Partial<Omit<ProgramFollowupRuleRow, "program_id" | "question_id" | "operator">>;

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

export const CONTENT_OPPORTUNITY_TYPES = ["PROGRAM_GUIDE"] as const;

export type ContentOpportunityType = (typeof CONTENT_OPPORTUNITY_TYPES)[number];

export const CONTENT_OPPORTUNITY_STATUSES = [
  "DISCOVERED",
  "SELECTED",
  "RESEARCHING",
  "DRAFTED",
  "VALIDATION_FAILED",
  "READY_FOR_REVIEW",
  "SKIPPED",
  "ERROR",
] as const;

export type ContentOpportunityStatus = (typeof CONTENT_OPPORTUNITY_STATUSES)[number];

export const CONTENT_PIPELINE_RUN_MODES = ["DRY_RUN"] as const;

export type ContentPipelineRunMode = (typeof CONTENT_PIPELINE_RUN_MODES)[number];

export const CONTENT_PIPELINE_RUN_STATUSES = [
  "STARTED",
  "COMPLETED",
  "BLOCKED",
  "ERROR",
] as const;

export type ContentPipelineRunStatus = (typeof CONTENT_PIPELINE_RUN_STATUSES)[number];

export type ContentOpportunityRow = {
  id: string;
  opportunity_type: ContentOpportunityType;
  program_id: string | null;
  guide_id: string | null;
  proposed_slug: string | null;
  proposed_title: string | null;
  primary_keyword: string | null;
  secondary_keywords: string[];
  score: number;
  score_breakdown: Json;
  discovery_reason: string | null;
  status: ContentOpportunityStatus;
  next_eligible_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentOpportunityInsert = Pick<
  ContentOpportunityRow,
  "opportunity_type" | "score" | "status"
> &
  Partial<Omit<ContentOpportunityRow, "opportunity_type" | "score" | "status">>;

export type ContentPipelineRunRow = {
  id: string;
  opportunity_id: string | null;
  mode: ContentPipelineRunMode;
  status: ContentPipelineRunStatus;
  started_at: string;
  completed_at: string | null;
  selected_reason: string | null;
  evidence_snapshot: Json | null;
  draft_snapshot: Json | null;
  validation_snapshot: Json | null;
  error_message: string | null;
  provider_metadata: Json | null;
  authoritative_state_fingerprint: string | null;
  created_at: string;
};

export const CONTENT_AUTOMATION_TRIGGERS = ["MANUAL", "CRON"] as const;

export type ContentAutomationTrigger = (typeof CONTENT_AUTOMATION_TRIGGERS)[number];

export const CONTENT_AUTOMATION_STATUSES = [
  "STARTED",
  "NOT_DUE",
  "LOCKED",
  "GENERATED",
  "BLOCKED",
  "ERROR",
  "COMPLETED_DRY_RUN",
  "PUBLISHED",
  "RECONCILED",
] as const;

export type ContentAutomationStatus = (typeof CONTENT_AUTOMATION_STATUSES)[number];

export type ContentAutomationScheduleRow = {
  id: "default";
  last_successful_publish_at: string | null;
  next_publish_at: string;
  updated_at: string;
};

export type ContentAutomationLockRow = {
  lock_key: string;
  owner_id: string;
  acquired_at: string;
  expires_at: string;
};

export type ContentAutomationExecutionRow = {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: ContentAutomationStatus;
  trigger: ContentAutomationTrigger;
  due: boolean | null;
  lock_owner: string | null;
  pipeline_run_id: string | null;
  opportunity_id: string | null;
  program_id: string | null;
  provider: string | null;
  attempt_count: number;
  drafts_generated: number;
  validation_passed: boolean | null;
  authoritative_state_fingerprint: string | null;
  publish_attempted: boolean;
  publish_succeeded: boolean;
  guide_id: string | null;
  published_at: string | null;
  error_code: string | null;
  error_message: string | null;
  provider_usage: Json | null;
  created_at: string;
  updated_at: string;
};

export type ContentPipelineRunInsert = Pick<ContentPipelineRunRow, "status"> &
  Partial<Omit<ContentPipelineRunRow, "status">>;

export type Database = {
  public: {
    Tables: {
      programs: {
        Row: ProgramRow;
        Insert: ProgramInsert;
        Update: Partial<ProgramRow>;
        Relationships: [];
      };
      program_benefit_tiers: {
        Row: ProgramBenefitTierRow;
        Insert: Pick<ProgramBenefitTierRow, "program_id" | "label" | "condition_summary"> &
          Partial<Omit<ProgramBenefitTierRow, "program_id" | "label" | "condition_summary">>;
        Update: Partial<ProgramBenefitTierRow>;
        Relationships: [];
      };
      program_rules: {
        Row: ProgramRuleRow;
        Insert: ProgramRuleInsert;
        Update: Partial<ProgramRuleRow>;
        Relationships: [];
      };
      program_followup_questions: {
        Row: ProgramFollowupQuestionRow;
        Insert: ProgramFollowupQuestionInsert;
        Update: Partial<ProgramFollowupQuestionRow>;
        Relationships: [];
      };
      program_followup_rules: {
        Row: ProgramFollowupRuleRow;
        Insert: ProgramFollowupRuleInsert;
        Update: Partial<ProgramFollowupRuleRow>;
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
      content_opportunities: {
        Row: ContentOpportunityRow;
        Insert: ContentOpportunityInsert;
        Update: Partial<ContentOpportunityRow>;
        Relationships: [];
      };
      content_pipeline_runs: {
        Row: ContentPipelineRunRow;
        Insert: ContentPipelineRunInsert;
        Update: Partial<ContentPipelineRunRow>;
        Relationships: [];
      };
      content_automation_schedule: {
        Row: ContentAutomationScheduleRow;
        Insert: ContentAutomationScheduleRow;
        Update: Partial<ContentAutomationScheduleRow>;
        Relationships: [];
      };
      content_automation_locks: {
        Row: ContentAutomationLockRow;
        Insert: ContentAutomationLockRow;
        Update: Partial<ContentAutomationLockRow>;
        Relationships: [];
      };
      content_automation_executions: {
        Row: ContentAutomationExecutionRow;
        Insert: Pick<ContentAutomationExecutionRow, "id" | "status" | "trigger"> &
          Partial<Omit<ContentAutomationExecutionRow, "id" | "status" | "trigger">>;
        Update: Partial<ContentAutomationExecutionRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      publish_content_guide: {
        Args: {
          p_guide_id: string;
          p_opportunity_id: string;
          p_program_id: string;
          p_title: string;
          p_slug: string;
          p_seo_title: string | null;
          p_meta_description: string | null;
          p_excerpt: string | null;
          p_body: string;
          p_published_at: string;
          p_fail_at?: string | null;
        };
        Returns: Json;
      };
      acquire_content_automation_lock: {
        Args: {
          p_lock_key: string;
          p_owner_id: string;
          p_lease_seconds: number;
        };
        Returns: Json;
      };
      renew_content_automation_lock: {
        Args: {
          p_lock_key: string;
          p_owner_id: string;
          p_lease_seconds: number;
        };
        Returns: Json;
      };
      owns_content_automation_lock: {
        Args: {
          p_lock_key: string;
          p_owner_id: string;
        };
        Returns: boolean;
      };
      release_content_automation_lock: {
        Args: {
          p_lock_key: string;
          p_owner_id: string;
        };
        Returns: boolean;
      };
    };
    // Constrained values are TEXT + CHECK in SQL, not PostgreSQL enum types.
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
