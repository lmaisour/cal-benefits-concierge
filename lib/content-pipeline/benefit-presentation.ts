import type { BenefitAmountStructure, BenefitType } from "@/types/database";

export type BenefitPresentationFamily =
  | "cash"
  | "rebate"
  | "tax_credit"
  | "bill_savings"
  | "free_service"
  | "free_product"
  | "forgivable_loan"
  | "loan"
  | "financing"
  | "other";

const FAMILY_BY_TYPE: Record<BenefitType, BenefitPresentationFamily> = {
  CASH: "cash",
  REBATE: "rebate",
  TAX_CREDIT: "tax_credit",
  BILL_SAVINGS: "bill_savings",
  FREE_SERVICE: "free_service",
  FREE_PRODUCT: "free_product",
  FORGIVABLE_LOAN: "forgivable_loan",
  LOAN: "loan",
  FINANCING: "financing",
  OTHER: "other",
};

export function benefitPresentationFamily(
  type: BenefitType,
): BenefitPresentationFamily {
  return FAMILY_BY_TYPE[type];
}

export function isMonetaryBenefitType(type: BenefitType): boolean {
  return type === "CASH" || type === "REBATE" || type === "TAX_CREDIT";
}

export function isFreeInKindBenefitType(type: BenefitType): boolean {
  return type === "FREE_SERVICE" || type === "FREE_PRODUCT";
}

export function isRepayableFinancingType(type: BenefitType): boolean {
  return type === "LOAN" || type === "FINANCING";
}

export function isForgivableLoanType(type: BenefitType): boolean {
  return type === "FORGIVABLE_LOAN";
}

export function isFinancingBenefitType(type: BenefitType): boolean {
  return isRepayableFinancingType(type) || isForgivableLoanType(type);
}

export function hasStructuredMonetaryAmount(
  structure: BenefitAmountStructure,
): boolean {
  return structure === "SINGLE" || structure === "RANGE" || structure === "TIERED";
}

/**
 * Amount FAQs are only emitted when the benefit actually has a consumer
 * monetary/financing amount. Free services/products never get one.
 */
export function shouldIncludeAmountFaq(
  type: BenefitType,
  structure: BenefitAmountStructure,
): boolean {
  if (isFreeInKindBenefitType(type)) {
    return false;
  }
  if (type === "OTHER") {
    return hasStructuredMonetaryAmount(structure);
  }
  if (isFinancingBenefitType(type) || type === "BILL_SAVINGS") {
    return hasStructuredMonetaryAmount(structure);
  }
  return isMonetaryBenefitType(type);
}

export function amountFaqQuestion(type: BenefitType): string {
  if (type === "BILL_SAVINGS") {
    return "How much could I save?";
  }
  if (isFinancingBenefitType(type)) {
    return "How much financing is available?";
  }
  return "How much could I receive?";
}

export function unknownAmountGuidance(type: BenefitType): string {
  switch (type) {
    case "CASH":
      return "The cash amount is not fully listed in the structured catalog. Confirm the current amount on the official source.";
    case "REBATE":
      return "The rebate amount is not fully listed in the structured catalog. Confirm the current amount on the official source.";
    case "TAX_CREDIT":
      return "The tax credit amount is not fully listed in the structured catalog. Confirm the current amount on the official source.";
    case "BILL_SAVINGS":
      return "Bill savings depend on program conditions. Confirm the current details on the official source.";
    case "LOAN":
    case "FINANCING":
    case "FORGIVABLE_LOAN":
      return "Financing terms are not fully listed in the structured catalog. Confirm the current terms on the official source.";
    case "FREE_SERVICE":
      return "This is a free service, not a cash award.";
    case "FREE_PRODUCT":
      return "This is a free product, not a cash award.";
    case "OTHER":
      return "Details of this benefit are not fully classified in the catalog. Confirm what the program provides on the official source.";
  }
}

export function tieredAmountGuidance(type: BenefitType): string {
  if (isFinancingBenefitType(type)) {
    return "You may qualify for one of the following financing amounts, depending on the structured conditions below. Each listed amount applies only when its stated condition is met.";
  }
  if (type === "BILL_SAVINGS") {
    return "You may qualify for one of the following savings amounts, depending on the structured conditions below. Each listed amount applies only when its stated condition is met.";
  }
  return "You may qualify for one of the following awards, depending on the structured conditions below. Each listed amount applies only when its stated condition is met.";
}

export function overviewTieredGuidance(type: BenefitType): string {
  if (isFinancingBenefitType(type)) {
    return "Financing amounts are condition-dependent.";
  }
  if (type === "BILL_SAVINGS") {
    return "Bill savings are condition-dependent.";
  }
  if (isFreeInKindBenefitType(type)) {
    return unknownAmountGuidance(type);
  }
  return "Award amounts are condition-dependent.";
}

export function metaDescriptionSuffix(type: BenefitType): string {
  if (isFreeInKindBenefitType(type)) {
    return " may help qualifying households. See who may qualify, what the program provides, and how to apply. Confirm details on the official source.";
  }
  if (isFinancingBenefitType(type)) {
    return " may help qualifying households. See who may qualify, how the financing works, and how to apply. Confirm details on the official source.";
  }
  return " may help qualifying households. See who may qualify, what you may receive, and how to apply. Confirm details on the official source.";
}

export function freeInKindFraming(type: BenefitType): string | null {
  if (type === "FREE_SERVICE") {
    return "This is a free service, not a cash award.";
  }
  if (type === "FREE_PRODUCT") {
    return "This is a free product, not a cash award.";
  }
  return null;
}

export function financingFraming(type: BenefitType): string | null {
  if (type === "LOAN") {
    return "This benefit is a loan, which must be repaid. Treat it as financing, not a grant or cash award.";
  }
  if (type === "FINANCING") {
    return "This benefit is financing, which must be repaid. Treat it as financing, not a grant or cash award.";
  }
  if (type === "FORGIVABLE_LOAN") {
    return "This benefit is a forgivable loan. It may need to be repaid if program conditions are not met. It is not a grant or cash you keep.";
  }
  return null;
}

export const AWARD_FRAMING_PATTERN =
  /\b(award amounts|the current award|how much could i receive)\b/i;
