import type { ProgramCatalog } from "@/lib/programs/import/types";
import type { Program, ProgramLocation, ProgramRule } from "@/types/program";

export type EngineCatalog = {
  programs: Program[];
  rules: ProgramRule[];
  locations: ProgramLocation[];
};

export function catalogToEngine(catalog: ProgramCatalog): EngineCatalog {
  const idByExternal = new Map<string, string>();
  catalog.programs.forEach((program, index) => {
    idByExternal.set(program.external_id, syntheticId(index + 1));
  });

  const programs: Program[] = catalog.programs.map((program) => ({
    id: idByExternal.get(program.external_id)!,
    external_id: program.external_id,
    name: program.name,
    slug: program.slug,
    administrator: program.administrator,
    category: program.category,
    subcategory: program.subcategory,
    short_description: program.short_description,
    description: program.description,
    benefit_summary: program.benefit_summary,
    benefit_type: program.benefit_type,
    benefit_min: program.benefit_min,
    benefit_max: program.benefit_max,
    benefit_period: program.benefit_period,
    status: program.status,
    official_url: program.official_url,
    application_url: program.application_url,
    statewide: program.statewide,
    preapproval_required: program.preapproval_required,
    purchase_before_approval_allowed: program.purchase_before_approval_allowed,
    effective_start: program.effective_start,
    effective_end: program.effective_end,
    application_deadline: program.application_deadline,
    last_verified_at: program.last_verified_at,
    confidence: program.confidence,
    featured: program.featured,
    active: program.active,
    has_unmodeled_required_criteria: program.has_unmodeled_required_criteria,
    unmodeled_required_criteria_summary: program.unmodeled_required_criteria_summary,
    created_at: program.last_verified_at,
    updated_at: program.last_verified_at,
  }));

  const rules: ProgramRule[] = catalog.rules.map((rule, index) => ({
    id: syntheticId(10_000 + index),
    program_id: idByExternal.get(rule.program_external_id)!,
    field: rule.field,
    operator: rule.operator,
    value: rule.value,
    rule_group: rule.rule_group,
    group_operator: rule.group_operator,
    required: rule.required,
    explanation: rule.explanation,
    created_at: "2026-09-06T00:00:00Z",
  }));

  const locations: ProgramLocation[] = catalog.locations.map((location, index) => ({
    id: syntheticId(20_000 + index),
    program_id: idByExternal.get(location.program_external_id)!,
    location_type: location.location_type,
    location_value: location.location_value,
    created_at: "2026-09-06T00:00:00Z",
  }));

  return { programs, rules, locations };
}

export function consumerVisiblePrograms(catalog: ProgramCatalog): EngineCatalog {
  const engine = catalogToEngine(catalog);
  const visible = engine.programs.filter(
    (program) => program.active && program.status !== "EXPIRED",
  );
  const ids = new Set(visible.map((program) => program.id));
  return {
    programs: visible,
    rules: engine.rules.filter((rule) => ids.has(rule.program_id)),
    locations: engine.locations.filter((location) => ids.has(location.program_id)),
  };
}

function syntheticId(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}
