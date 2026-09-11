import { WHO_THIS_IS_FOR_LABEL, atAGlanceItems } from "@/lib/programs/at-a-glance";
import { eligibilityHighlightFacts } from "@/lib/programs/eligibility-facts";
import type { Program, ProgramLocation, ProgramRule } from "@/types/program";

export type SummaryFact = {
  label: string;
  value: string;
};

function valueByLabel(items: { label: string; value: string }[], label: string): string | undefined {
  return items.find((item) => item.label === label)?.value;
}

function isUnconfirmedServiceArea(value: string | undefined): boolean {
  return !value || value === "Service area needs to be confirmed";
}

function geographicServiceArea(
  serviceArea: string | undefined,
  utility: string | undefined,
): string | undefined {
  if (!serviceArea || isUnconfirmedServiceArea(serviceArea)) {
    return undefined;
  }
  const parts = serviceArea.split("; ").filter(Boolean);
  const kept = parts.filter((part) => {
    if (!utility) {
      return true;
    }
    const match = /^Available to eligible (.+) customers$/i.exec(part);
    return !(match && match[1].toLowerCase() === utility.toLowerCase());
  });
  return kept.length > 0 ? kept.join("; ") : undefined;
}

export function programSummaryFacts(input: {
  program: Program;
  rules: ProgramRule[];
  locations: ProgramLocation[];
}): SummaryFact[] {
  const glance = atAGlanceItems(input);
  const eligibility = eligibilityHighlightFacts(input);
  const facts: SummaryFact[] = [];

  const who = valueByLabel(glance, WHO_THIS_IS_FOR_LABEL);
  const status = valueByLabel(glance, "Current status");
  const location = valueByLabel(eligibility, "Location");
  const eligibilityIncome = valueByLabel(eligibility, "Income");
  const glanceIncome = valueByLabel(glance, "Income");
  const housing = valueByLabel(eligibility, "Housing") ?? valueByLabel(glance, "Homeownership");
  const utility = valueByLabel(eligibility, "Utility");
  const serviceArea = geographicServiceArea(valueByLabel(glance, "Service area"), utility);
  const administrator = valueByLabel(glance, "Administrator");
  const lastVerified = valueByLabel(glance, "Last verified");

  const hasAudienceFact = Boolean(
    serviceArea || location || eligibilityIncome || glanceIncome || housing || utility,
  );
  if (who && !hasAudienceFact) {
    facts.push({ label: WHO_THIS_IS_FOR_LABEL, value: who });
  }

  if (status) {
    facts.push({ label: "Status", value: status });
  }

  if (serviceArea) {
    facts.push({ label: "Service area", value: serviceArea });
  } else if (location) {
    facts.push({ label: "Service area", value: location });
  }

  if (eligibilityIncome) {
    facts.push({ label: "Income", value: eligibilityIncome });
  } else if (glanceIncome) {
    facts.push({ label: "Income", value: glanceIncome });
  }

  if (housing) {
    facts.push({ label: "Housing", value: housing });
  }

  if (utility) {
    facts.push({ label: "Utility", value: utility });
  }

  if (administrator) {
    facts.push({ label: "Administrator", value: administrator });
  }

  if (lastVerified) {
    facts.push({ label: "Last verified", value: lastVerified });
  }

  return facts;
}
