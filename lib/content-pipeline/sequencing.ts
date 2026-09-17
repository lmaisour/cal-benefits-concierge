export type SequencingAction =
  | "purchase"
  | "installation"
  | "project_start"
  | "vehicle_retirement"
  | "enrollment";

export function resolveSequencingAction(input: {
  category?: string | null;
  subcategory?: string | null;
  modeledFields?: string[];
}): SequencingAction {
  const fields = new Set(input.modeledFields ?? []);
  const subcategory = (input.subcategory ?? "").toLowerCase();

  if (
    fields.has("willing_to_retire_vehicle") ||
    subcategory.includes("vehicle-retirement") ||
    subcategory.includes("scrappage")
  ) {
    return "vehicle_retirement";
  }
  if (
    subcategory.includes("install") ||
    subcategory.includes("repair") ||
    subcategory.includes("weatherization")
  ) {
    return "installation";
  }
  if (
    subcategory.includes("project") ||
    subcategory.includes("construction") ||
    subcategory.includes("upgrade")
  ) {
    return "project_start";
  }
  return "purchase";
}

export function sequencingCopy(action: SequencingAction): string {
  switch (action) {
    case "vehicle_retirement":
      return "Apply and receive approval before retiring or delivering your vehicle. Retiring the vehicle before approval may make you ineligible.";
    case "installation":
      return "Apply before installation or repair work begins. Starting work before approval may make you ineligible.";
    case "project_start":
      return "Apply before the project starts. Starting work before approval may make you ineligible.";
    case "enrollment":
      return "Apply before you take the program action. Acting before approval may make you ineligible.";
    case "purchase":
      return "Apply before you buy the item. Purchasing before approval may make you ineligible.";
  }
}

export function sequencingActionFromEvidence(evidence: {
  category?: string | null;
  subcategory?: string | null;
  eligibility: { modeled_rules: Array<{ field: string }> };
}): SequencingAction {
  return resolveSequencingAction({
    category: evidence.category,
    subcategory: evidence.subcategory,
    modeledFields: evidence.eligibility.modeled_rules.map((rule) => rule.field),
  });
}
