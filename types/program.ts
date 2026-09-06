import type {
  BenefitType,
  Confidence,
  LocationType,
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
  LocationType,
  ProgramStatus,
  RelationshipType,
  RuleGroupOperator,
  RuleOperator,
  SourceType,
};

export type Program = ProgramRow;
export type ProgramRule = ProgramRuleRow;
export type ProgramLocation = ProgramLocationRow;
export type ProgramSource = ProgramSourceRow;
export type ProgramRelationship = ProgramRelationshipRow;

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
