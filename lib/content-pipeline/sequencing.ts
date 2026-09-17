/**
 * Sequencing restriction copy is emitted only when
 * `purchase_before_approval_allowed === false`. That flag is a restriction,
 * not proof of the underlying action type.
 *
 * Authoritative action-type fields (modeled eligibility rule `field` values):
 * - `willing_to_retire_vehicle` → vehicle_retirement
 *
 * Not authoritative, and never used to name the action:
 * - `category` / `subcategory` taxonomy or substring matching
 * - `purchase_before_approval_allowed` itself (restriction only)
 *
 * No current structured field establishes purchase, installation, repair,
 * construction, or project-start semantics. Those actions are not inferred.
 */
export type SequencingAction = "vehicle_retirement" | "generic";

const VEHICLE_RETIREMENT_FIELDS = new Set(["willing_to_retire_vehicle"]);

export const GENERIC_SEQUENCING_COPY =
  "Approval is required before taking the action covered by this program. Check the official program instructions before making a purchase, starting work, or taking another irreversible step.";

export const VEHICLE_RETIREMENT_SEQUENCING_COPY =
  "Apply and receive approval before retiring or delivering your vehicle. Retiring the vehicle before approval may make you ineligible.";

export function resolveSequencingAction(input: {
  modeledFields?: string[];
}): SequencingAction {
  const fields = new Set(input.modeledFields ?? []);
  for (const field of fields) {
    if (VEHICLE_RETIREMENT_FIELDS.has(field)) {
      return "vehicle_retirement";
    }
  }
  return "generic";
}

export function sequencingCopy(action: SequencingAction): string {
  switch (action) {
    case "vehicle_retirement":
      return VEHICLE_RETIREMENT_SEQUENCING_COPY;
    case "generic":
      return GENERIC_SEQUENCING_COPY;
  }
}

export function sequencingActionFromEvidence(evidence: {
  eligibility: { modeled_rules: Array<{ field: string }> };
}): SequencingAction {
  return resolveSequencingAction({
    modeledFields: evidence.eligibility.modeled_rules.map((rule) => rule.field),
  });
}
