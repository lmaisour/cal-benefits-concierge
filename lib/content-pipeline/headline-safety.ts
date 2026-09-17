import { looksLikeSynthesizedRange } from "@/lib/content-pipeline/amount-structure";
import type { EvidencePackage } from "@/lib/content-pipeline/types";

const TITLE_OVERCLAIM =
  /\b(you qualify|everyone qualifies|all residents qualify|guaranteed|automatically eligible|you are eligible)\b/i;

const UP_TO_AMOUNT = /up to \$\s*([\d,]+(?:\.\d+)?)/gi;

function parseDollarAmounts(text: string): number[] {
  const found: number[] = [];
  const pattern = /\$\s*([\d,]+(?:\.\d+)?)/g;
  for (const match of text.matchAll(pattern)) {
    const value = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(value)) {
      found.push(value);
    }
  }
  return found;
}

export function maxAttainableAmount(evidence: EvidencePackage): number | null {
  if (evidence.benefit.amount_structure === "TIERED") {
    const amounts = evidence.benefit.tiers
      .map((tier) => tier.amount)
      .filter((amount): amount is number => amount !== null);
    return amounts.length > 0 ? Math.max(...amounts) : null;
  }
  if (
    evidence.benefit.amount_structure === "RANGE" ||
    evidence.benefit.amount_structure === "SINGLE"
  ) {
    return evidence.benefit.max ?? evidence.benefit.min;
  }
  return null;
}

function allowedHeadlineAmounts(evidence: EvidencePackage): Set<number> {
  if (evidence.benefit.amount_structure === "TIERED") {
    return new Set(
      evidence.benefit.tiers
        .map((tier) => tier.amount)
        .filter((amount): amount is number => amount !== null),
    );
  }
  if (evidence.benefit.amount_structure === "UNKNOWN") {
    return new Set();
  }
  const amounts = new Set<number>();
  if (evidence.benefit.min !== null) {
    amounts.add(evidence.benefit.min);
  }
  if (evidence.benefit.max !== null) {
    amounts.add(evidence.benefit.max);
  }
  return amounts;
}

export function extractUpToAmounts(text: string): number[] {
  const found: number[] = [];
  for (const match of text.matchAll(new RegExp(UP_TO_AMOUNT))) {
    const value = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(value)) {
      found.push(value);
    }
  }
  return found;
}

export function isSafeConsumerHeadline(
  headline: string,
  evidence: EvidencePackage,
): boolean {
  const text = headline.trim();
  if (!text) {
    return false;
  }
  if (looksLikeSynthesizedRange(text) || TITLE_OVERCLAIM.test(text)) {
    return false;
  }

  const amounts = parseDollarAmounts(text);
  const allowed = allowedHeadlineAmounts(evidence);
  for (const amount of amounts) {
    if (!allowed.has(amount)) {
      return false;
    }
  }

  const max = maxAttainableAmount(evidence);
  for (const amount of extractUpToAmounts(text)) {
    if (max === null || amount !== max) {
      return false;
    }
  }

  if (evidence.benefit.amount_structure === "TIERED") {
    const distinct = new Set(
      evidence.benefit.tiers
        .map((tier) => tier.amount)
        .filter((amount): amount is number => amount !== null),
    );
    if (distinct.size > 1 && amounts.length > 0 && extractUpToAmounts(text).length === 0) {
      return false;
    }
  }

  if (evidence.benefit.amount_structure === "UNKNOWN" && amounts.length > 0) {
    return false;
  }

  return true;
}

export function safeConsumerHeadline(evidence: EvidencePackage): string | null {
  const headline = evidence.consumer_headline?.trim() || null;
  if (!headline) {
    return null;
  }
  return isSafeConsumerHeadline(headline, evidence) ? headline : null;
}
