import type {
  BenefitType,
  Confidence,
  ContentBriefRow,
  ContentBriefType,
  ContentEvidenceRow,
  GuideProgramRow,
  GuideRow,
  HomepageFeatureRow,
  LocationType,
  ProgramContentRow,
  ProgramFaqRow,
  ProgramFollowupQuestionRow,
  ProgramFollowupRuleRow,
  ProgramLocationRow,
  ProgramRelationshipRow,
  ProgramRow,
  ProgramRuleRow,
  ProgramSourceRow,
  ProgramStatus,
  RelationshipType,
  RuleGroupOperator,
  RuleOperator,
  SourceType,
} from "@/types/database";

export type {
  BenefitType,
  Confidence,
  ContentBriefType,
  LocationType,
  ProgramStatus,
  RelationshipType,
  RuleGroupOperator,
  RuleOperator,
  SourceType,
};

export type Program = ProgramRow;
export type ProgramRule = ProgramRuleRow;
export type ProgramFollowupQuestion = ProgramFollowupQuestionRow;
export type ProgramFollowupRule = ProgramFollowupRuleRow;
export type ProgramLocation = ProgramLocationRow;
export type ProgramSource = ProgramSourceRow;
export type ProgramRelationship = ProgramRelationshipRow;
export type ProgramContent = ProgramContentRow;
export type ProgramFaq = ProgramFaqRow;
export type Guide = GuideRow;
export type GuideProgram = GuideProgramRow;
export type HomepageFeature = HomepageFeatureRow;
export type ContentBrief = ContentBriefRow;
export type ContentEvidence = ContentEvidenceRow;

export const SAVINGS_BENEFIT_TYPES: readonly BenefitType[] = [
  "CASH",
  "REBATE",
  "TAX_CREDIT",
  "BILL_SAVINGS",
  "FREE_SERVICE",
  "FREE_PRODUCT",
  "FORGIVABLE_LOAN",
];

export function isSavingsBenefitType(type: BenefitType): boolean {
  return SAVINGS_BENEFIT_TYPES.includes(type);
}
