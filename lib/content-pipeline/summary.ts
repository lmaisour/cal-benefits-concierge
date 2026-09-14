import type { DryRunPipelineResult, DryRunSummary } from "@/lib/content-pipeline/types";

export function toDryRunSummary(
  result: DryRunPipelineResult,
  options: { includeSnapshots?: boolean } = {},
): DryRunSummary {
  const blockers = [
    ...(result.validation?.errors.map((error) => error.message) ?? []),
    ...(result.run.status === "BLOCKED" && !result.opportunity
      ? [result.run.selected_reason ?? "No safe candidate."]
      : []),
    ...(result.run.error_message && result.run.status === "ERROR"
      ? [result.run.error_message]
      : []),
  ];

  const summary: DryRunSummary = {
    run_id: result.run.id,
    mode: result.run.mode,
    status: result.run.status,
    selected_opportunity: result.opportunity
      ? {
          id: result.opportunity.id,
          opportunity_type: result.opportunity.opportunity_type,
          program_id: result.opportunity.program_id,
          external_id: result.evidence?.external_id ?? null,
          proposed_slug: result.opportunity.proposed_slug,
          proposed_title: result.opportunity.proposed_title,
          score: result.opportunity.score,
          status: result.opportunity.status,
          discovery_reason: result.opportunity.discovery_reason,
        }
      : null,
    selected_reason: result.run.selected_reason,
    validation: result.validation
      ? {
          passed: result.validation.passed,
          errors: result.validation.errors,
          warnings: result.validation.warnings,
        }
      : null,
    blockers,
    published: false,
    error_message: result.run.error_message,
    candidates_considered: result.candidates_considered,
  };

  if (options.includeSnapshots) {
    if (result.evidence) {
      summary.evidence = result.evidence;
    }
    if (result.draft) {
      summary.draft = result.draft;
    }
  }

  return summary;
}
