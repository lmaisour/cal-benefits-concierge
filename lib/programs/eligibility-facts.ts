import {
  hasModeledIncomeRequirement,
  modeledHousingFact,
} from "@/lib/programs/at-a-glance";
import { formatLocationCoverageLines } from "@/lib/programs/format-location-coverage";
import type { Program, ProgramLocation, ProgramRule } from "@/types/program";

export type EligibilityFact = {
  label: string;
  value: string;
};

function compactLocationValue(line: string): string | null {
  if (!line || line === "Service area needs to be confirmed") {
    return null;
  }
  if (line === "Statewide in California") {
    return "California";
  }
  if (line.startsWith("Available in ")) {
    return line.slice("Available in ".length);
  }
  return null;
}

function uniqueUtilities(locations: ProgramLocation[]): string[] {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const row of locations) {
    if (row.location_type !== "ELECTRIC_UTILITY" && row.location_type !== "GAS_UTILITY") {
      continue;
    }
    const name = row.location_value.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) {
      continue;
    }
    seen.add(key);
    values.push(name);
  }
  return values;
}

export function eligibilityHighlightFacts(input: {
  program: Program;
  rules: ProgramRule[];
  locations: ProgramLocation[];
}): EligibilityFact[] {
  const facts: EligibilityFact[] = [];
  const locationLines = formatLocationCoverageLines(
    input.program.statewide,
    input.locations,
  );
  for (const line of locationLines) {
    const compact = compactLocationValue(line);
    if (compact) {
      facts.push({ label: "Location", value: compact });
      break;
    }
  }

  if (hasModeledIncomeRequirement(input.rules)) {
    facts.push({ label: "Income", value: "Income limits apply" });
  }

  const housing = modeledHousingFact(input.rules);
  if (housing) {
    facts.push({ label: "Housing", value: housing });
  }

  const utilities = uniqueUtilities(input.locations);
  if (utilities.length === 1) {
    facts.push({ label: "Utility", value: utilities[0] });
  } else if (utilities.length === 2) {
    facts.push({ label: "Utility", value: `${utilities[0]} and ${utilities[1]}` });
  }

  return facts.slice(0, 5);
}
