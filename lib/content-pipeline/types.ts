import type {
  BenefitAmountStructure,
  BenefitTier,
} from "@/lib/content-pipeline/amount-structure";
import type {
  BenefitType,
  Confidence,
  ContentOpportunityStatus,
  ContentPipelineRunMode,
  ContentPipelineRunStatus,
  LocationType,
  ProgramStatus,
  RuleOperator,
  SourceType,
} from "@/types/database";
import type {
  CatalogLocation,
  CatalogProgram,
  CatalogRule,
  CatalogSource,
} from "@/lib/programs/import/types";

export const CONTENT_PIPELINE_OPPORTUNITY_TYPE = "PROGRAM_GUIDE" as const;

export type EditorialContent = {
  seo_title?: string | null;
  meta_description?: string | null;
  overview?: string | null;
  benefit_explanation?: string | null;
  how_to_apply?: string | null;
  documents_needed?: string | null;
  important_notes?: string | null;
};

export type EditorialFaq = {
  question: string;
  answer: string;
  sort_order?: number;
};

export type EditorialBrief = {
  primary_keyword?: string | null;
  secondary_keywords?: string[] | null;
  suggested_title?: string | null;
  suggested_meta_description?: string | null;
  questions_to_answer?: string[] | null;
  topics_to_cover?: string[] | null;
  search_intent?: string | null;
};

export type EditorialEvidenceRow = {
  content_section: string;
  claim: string;
  source_url: string;
  source_title?: string | null;
  source_publisher?: string | null;
  source_date?: string | null;
  verified_at?: string | null;
  confidence?: Confidence | null;
  notes?: string | null;
};

export type DiscoveryRecord = {
  program_id: string;
  program: CatalogProgram;
  rules: CatalogRule[];
  locations: CatalogLocation[];
  sources: CatalogSource[];
  content: EditorialContent | null;
  faqs: EditorialFaq[];
  brief: EditorialBrief | null;
  evidence_rows: EditorialEvidenceRow[];
};

export type DiscoverySkipReason =
  | "STATUS_NOT_ACTIVE"
  | "INACTIVE"
  | "LOW_CONFIDENCE"
  | "MISSING_OFFICIAL_SOURCE"
  | "STALE_VERIFICATION"
  | "GOLD_STANDARD_COMPLETE";

export type SkippedDiscovery = {
  external_id: string;
  slug: string;
  reason: DiscoverySkipReason;
};

export type ScoreComponent = {
  key: string;
  points: number;
  reason: string;
};

export type ScoreBreakdown = {
  version: 1;
  total: number;
  components: ScoreComponent[];
  notes: string[];
};

export type DiscoveredOpportunity = {
  opportunity_type: typeof CONTENT_PIPELINE_OPPORTUNITY_TYPE;
  program_id: string;
  external_id: string;
  proposed_slug: string;
  proposed_title: string;
  primary_keyword: string;
  secondary_keywords: string[];
  discovery_reason: string;
  record: DiscoveryRecord;
};

export type ScoredOpportunity = DiscoveredOpportunity & {
  score: number;
  score_breakdown: ScoreBreakdown;
};

export type ContentOpportunityRecord = {
  id: string;
  opportunity_type: typeof CONTENT_PIPELINE_OPPORTUNITY_TYPE;
  program_id: string;
  guide_id: string | null;
  proposed_slug: string;
  proposed_title: string;
  primary_keyword: string;
  secondary_keywords: string[];
  score: number;
  score_breakdown: ScoreBreakdown;
  discovery_reason: string;
  status: ContentOpportunityStatus;
  next_eligible_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentPipelineRunRecord = {
  id: string;
  opportunity_id: string | null;
  mode: ContentPipelineRunMode;
  status: ContentPipelineRunStatus;
  started_at: string;
  completed_at: string | null;
  selected_reason: string | null;
  evidence_snapshot: EvidencePackage | null;
  draft_snapshot: ContentDraft | null;
  validation_snapshot: ValidationResult | null;
  error_message: string | null;
  provider_metadata: ProviderMetadata | null;
  created_at: string;
};

export type EvidenceSource = {
  url: string;
  organization: string | null;
  source_type: SourceType | "OFFICIAL_URL";
  verified_at: string | null;
  notes: string | null;
};

export type EvidenceEligibilityRule = {
  field: string;
  operator: RuleOperator;
  value: unknown;
  required: boolean;
  explanation: string | null;
  rule_group: number;
};

export type EvidencePackage = {
  program_id: string;
  external_id: string;
  official_name: string;
  consumer_headline: string | null;
  status: ProgramStatus;
  active: boolean;
  administrator: string | null;
  geography: {
    statewide: boolean;
    locations: { type: LocationType; value: string }[];
  };
  benefit: {
    type: BenefitType;
    summary: string | null;
    min: number | null;
    max: number | null;
    period: string | null;
    repayable: boolean;
    amounts_are_structured_facts: boolean;
    amount_structure: BenefitAmountStructure;
    tiers: BenefitTier[];
  };
  eligibility: {
    modeled_rules: EvidenceEligibilityRule[];
    unmodeled_required: boolean;
    unmodeled_summary: string | null;
    tags_are_not_eligibility: true;
    unknown_is_not_a_fact: true;
  };
  application: {
    official_url: string | null;
    application_url: string | null;
    how_to_apply: string | null;
    documents: string | null;
    preapproval_required: boolean | null;
  };
  deadline: {
    application_deadline: string | null;
    effective_end: string | null;
    source: "structured" | null;
  };
  warnings: string[];
  official_sources: EvidenceSource[];
  verified_at: string | null;
  confidence: Confidence | null;
  freshness: {
    is_stale: boolean;
    last_verified_at: string | null;
  };
  existing_content: EditorialContent | null;
  faqs: EditorialFaq[];
  brief: EditorialBrief | null;
  content_evidence: EditorialEvidenceRow[];
  boilerplate: {
    not_exhaustive: string;
    cannot_determine_personal_eligibility: string;
    confirm_with_administrator: string;
    documents_unlisted: string;
    deadline_none: string;
    check_official_dates: string;
    eligibility_rules_limited: string;
    seo_title_suffix: string;
    h1_qualify_suffix: string;
    meta_description_suffix: string;
    faq_who_may_qualify: string;
    faq_how_to_apply: string;
    faq_documents: string;
    faq_only_consider: string;
    unknown_amount_guidance: string;
    tiered_amount_guidance: string;
  };
};

export type DraftFaq = {
  question: string;
  answer: string;
};

export type SuggestedInternalLink = {
  href: string;
  label: string;
  required: boolean;
};

export const FACTUAL_DRAFT_SECTIONS = [
  "seo_title",
  "meta_description",
  "h1",
  "dek",
  "overview",
  "what_you_get",
  "who_may_qualify",
  "how_to_apply",
  "documents",
  "important_notes",
  "faqs",
] as const;

export type FactualDraftSection = (typeof FACTUAL_DRAFT_SECTIONS)[number];

export type SourceClaim = {
  claim_id: string;
  text: string;
  evidence_path: string;
  source_url: string | null;
  section: FactualDraftSection;
};

export type ContentDraft = {
  seo_title: string;
  meta_description: string;
  h1: string;
  dek: string;
  overview: string;
  what_you_get: string;
  who_may_qualify: string;
  how_to_apply: string;
  documents: string;
  important_notes: string;
  faqs: DraftFaq[];
  suggested_internal_links: SuggestedInternalLink[];
  source_claims: SourceClaim[];
};

export type ValidationIssueCode =
  | "NO_OFFICIAL_SOURCE"
  | "PROGRAM_NOT_ACTIVE"
  | "LOW_CONFIDENCE_DEFINITE"
  | "UNSUPPORTED_AMOUNT"
  | "UNSUPPORTED_DEADLINE"
  | "UNSUPPORTED_ELIGIBILITY"
  | "INACTIVE_PRESENTED_AS_ACTIVE"
  | "LOAN_FRAMED_AS_SAVINGS"
  | "EXHAUSTIVE_CATALOG_CLAIM"
  | "TITLE_OVERSTATES_ELIGIBILITY"
  | "DEFINITE_QUALIFY_LANGUAGE"
  | "UNMAPPED_CLAIM"
  | "TIERED_BENEFIT_FLATTENED"
  | "UNKNOWN_AMOUNT_RANGE"
  | "UNSUPPORTED_TIER_AMOUNT"
  | "UNSUPPORTED_TIER_CONDITION"
  | "NEAR_DUPLICATE_CONTENT"
  | "BROKEN_INTERNAL_LINK"
  | "INVALID_SOURCE_URL"
  | "STALE_TIME_SENSITIVE"
  | "UNMODELED_CRITERIA_OMITTED";

export type ValidationIssue = {
  passed: false;
  code: ValidationIssueCode;
  message: string;
  evidence_path?: string;
};

export type ValidationWarning = {
  code: string;
  message: string;
  evidence_path?: string;
};

export type ValidationResult = {
  passed: boolean;
  errors: ValidationIssue[];
  warnings: ValidationWarning[];
};

export type ProviderMetadata = {
  provider: string;
  mode: ContentPipelineRunMode;
};

export type ContentDraftProvider = {
  readonly id: string;
  generateDraft(input: {
    evidence: EvidencePackage;
    opportunity: ScoredOpportunity;
  }): Promise<ContentDraft>;
};

export type DuplicateIndex = {
  slugs: string[];
  titles: string[];
};

export type PipelineCatalogContext = {
  records: DiscoveryRecord[];
  known_routes: string[];
  duplicates: DuplicateIndex;
};

export type DryRunPipelineResult = {
  run: ContentPipelineRunRecord;
  opportunity: ContentOpportunityRecord | null;
  evidence: EvidencePackage | null;
  draft: ContentDraft | null;
  validation: ValidationResult | null;
  candidates_considered: number;
  skipped: SkippedDiscovery[];
  published: false;
};

export type DryRunSummary = {
  run_id: string;
  mode: ContentPipelineRunMode;
  status: ContentPipelineRunStatus;
  selected_opportunity: {
    id: string;
    opportunity_type: typeof CONTENT_PIPELINE_OPPORTUNITY_TYPE;
    program_id: string;
    external_id: string | null;
    proposed_slug: string;
    proposed_title: string;
    score: number;
    status: ContentOpportunityStatus;
    discovery_reason: string;
  } | null;
  selected_reason: string | null;
  validation: {
    passed: boolean;
    errors: ValidationIssue[];
    warnings: ValidationWarning[];
  } | null;
  blockers: string[];
  published: false;
  error_message: string | null;
  candidates_considered: number;
  evidence?: EvidencePackage;
  draft?: ContentDraft;
};
