import type { CatalogProgram } from "@/lib/programs/import/types";
import type { ProgramInsert } from "@/types/database";

export function catalogProgramWriteFields(program: CatalogProgram): ProgramInsert {
  return {
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
    consumer_headline: program.consumer_headline,
    administrator_display_name: program.administrator_display_name,
    audience_tags: program.audience_tags,
  };
}

export function catalogProgramHasPresentation(program: CatalogProgram): boolean {
  return (
    program.consumer_headline !== null ||
    program.administrator_display_name !== null ||
    program.audience_tags !== null
  );
}

export function catalogProgramUpdateFields(program: CatalogProgram): ProgramInsert {
  const row = catalogProgramWriteFields(program);
  if (catalogProgramHasPresentation(program)) {
    return row;
  }
  const rest = { ...row };
  delete rest.consumer_headline;
  delete rest.administrator_display_name;
  delete rest.audience_tags;
  return rest;
}
