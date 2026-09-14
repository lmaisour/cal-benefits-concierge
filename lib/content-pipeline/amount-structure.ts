import {
  BENEFIT_AMOUNT_STRUCTURES,
  type BenefitAmountStructure,
} from "@/types/database";

export { BENEFIT_AMOUNT_STRUCTURES, type BenefitAmountStructure };

export type BenefitTier = {
  amount: number | null;
  label: string;
  condition_summary: string;
  evidence_path: string;
};

export type AmountStructureInput = {
  amount_structure?: string | null;
  min: number | null;
  max: number | null;
  tiers?: Array<Partial<BenefitTier> | null> | null;
};

const SYNTHESIZED_RANGE =
  /\$\s*[\d,]+(?:\.\d+)?\s*(?:to|through|–|—|-)\s*\$\s*[\d,]+(?:\.\d+)?/i;

const DEFINITE_SYNTHESIZED_AMOUNT =
  /\b(?:structured catalog (?:range|minimum|maximum|value)|get|gets|receive|receives|award(?:s)? (?:is|are|of)|worth)\b.{0,40}\$\s*[\d,]+/i;

export function isBenefitAmountStructure(
  value: unknown,
): value is BenefitAmountStructure {
  return (
    typeof value === "string" &&
    (BENEFIT_AMOUNT_STRUCTURES as readonly string[]).includes(value)
  );
}

export function normalizeBenefitTiers(
  tiers: AmountStructureInput["tiers"],
): BenefitTier[] {
  if (!tiers?.length) {
    return [];
  }
  return tiers.flatMap((tier, index) => {
    if (!tier) {
      return [];
    }
    const label = tier.label?.trim() ?? "";
    const condition_summary = tier.condition_summary?.trim() ?? "";
    if (!label || !condition_summary) {
      return [];
    }
    const amount =
      typeof tier.amount === "number" && Number.isFinite(tier.amount)
        ? tier.amount
        : null;
    return [
      {
        amount,
        label,
        condition_summary,
        evidence_path: tier.evidence_path?.trim() || `benefit.tiers.${index}`,
      },
    ];
  });
}

/**
 * Resolve how benefit amounts may be presented.
 * Never infer RANGE or TIERED from prose. TIERED requires modeled tier rows.
 * min !== max without an explicit RANGE flag is UNKNOWN, not a flattenable range.
 */
export function resolveBenefitAmountStructure(
  input: AmountStructureInput,
): BenefitAmountStructure {
  const tiers = normalizeBenefitTiers(input.tiers);
  const explicit = isBenefitAmountStructure(input.amount_structure)
    ? input.amount_structure
    : null;

  if (explicit === "TIERED") {
    return tiers.length > 0 ? "TIERED" : "UNKNOWN";
  }
  if (explicit === "RANGE") {
    if (
      input.min !== null &&
      input.max !== null &&
      input.min !== input.max
    ) {
      return "RANGE";
    }
    if (input.min !== null && input.max !== null && input.min === input.max) {
      return "SINGLE";
    }
    return "UNKNOWN";
  }
  if (explicit === "SINGLE") {
    return input.min !== null || input.max !== null ? "SINGLE" : "UNKNOWN";
  }
  if (explicit === "UNKNOWN") {
    return "UNKNOWN";
  }

  if (tiers.length > 0) {
    return "TIERED";
  }
  if (input.min !== null && input.max !== null) {
    return input.min === input.max ? "SINGLE" : "UNKNOWN";
  }
  if (input.min !== null || input.max !== null) {
    return "SINGLE";
  }
  return "UNKNOWN";
}

export function looksLikeSynthesizedRange(text: string): boolean {
  return SYNTHESIZED_RANGE.test(text);
}

export function looksLikeDefiniteSynthesizedAmount(text: string): boolean {
  return DEFINITE_SYNTHESIZED_AMOUNT.test(text);
}

export function extractSynthesizedRanges(text: string): string[] {
  return [...text.matchAll(new RegExp(SYNTHESIZED_RANGE, "gi"))].map(
    (match) => match[0],
  );
}
