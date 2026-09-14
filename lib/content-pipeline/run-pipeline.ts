import { buildEvidencePackage } from "@/lib/content-pipeline/build-evidence-package";
import { discoverOpportunities } from "@/lib/content-pipeline/discover-opportunities";
import { generateDraft } from "@/lib/content-pipeline/generate-draft";
import { newRunId, opportunityId } from "@/lib/content-pipeline/ids";
import { scoreOpportunities } from "@/lib/content-pipeline/score-opportunity";
import { selectOpportunity, selectionReason } from "@/lib/content-pipeline/select-opportunity";
import {
  getMemoryContentPipelineStore,
  opportunityStatusAfterValidation,
  runStatusAfterValidation,
  type ContentPipelineStore,
} from "@/lib/content-pipeline/store";
import { validateDraft } from "@/lib/content-pipeline/validate-draft";
import type {
  ContentDraftProvider,
  DryRunPipelineResult,
  PipelineCatalogContext,
  ProviderMetadata,
} from "@/lib/content-pipeline/types";

export type RunDryRunContentPipelineInput = {
  context: PipelineCatalogContext;
  provider: ContentDraftProvider;
  store?: ContentPipelineStore;
  now?: Date;
};

function iso(date: Date): string {
  return date.toISOString();
}

export async function runDryRunContentPipeline(
  input: RunDryRunContentPipelineInput,
): Promise<DryRunPipelineResult> {
  const now = input.now ?? new Date();
  const store = input.store ?? getMemoryContentPipelineStore();
  const startedAt = iso(now);
  const runId = newRunId();

  let run = await store.createRun({ id: runId, started_at: startedAt });

  const finish = async (
    patch: Parameters<ContentPipelineStore["updateRun"]>[1],
    extras: Omit<DryRunPipelineResult, "run" | "published">,
  ): Promise<DryRunPipelineResult> => {
    run = await store.updateRun(run.id, {
      ...patch,
      completed_at: patch.completed_at ?? iso(new Date()),
    });
    return { run, published: false, ...extras };
  };

  try {
    const discovered = discoverOpportunities({
      records: input.context.records,
      now,
    });
    const scored = scoreOpportunities(discovered.candidates, {
      now,
      duplicates: input.context.duplicates,
    });
    const selected = selectOpportunity(scored);

    if (!selected) {
      return finish(
        {
          status: "BLOCKED",
          selected_reason:
            "No safe candidate remained after discovery exclusions. Nothing was fabricated.",
          error_message: null,
        },
        {
          opportunity: null,
          evidence: null,
          draft: null,
          validation: null,
          candidates_considered: discovered.candidates.length,
          skipped: discovered.skipped,
        },
      );
    }

    const selectedReason = selectionReason(selected);
    const opportunity = await store.upsertOpportunity({
      id: opportunityId(selected.opportunity_type, selected.catalog_program_id),
      opportunity_type: selected.opportunity_type,
      program_id: selected.catalog_program_id,
      guide_id: null,
      proposed_slug: selected.proposed_slug,
      proposed_title: selected.proposed_title,
      primary_keyword: selected.primary_keyword,
      secondary_keywords: selected.secondary_keywords,
      score: selected.score,
      score_breakdown: selected.score_breakdown,
      discovery_reason: selected.discovery_reason,
      status: "SELECTED",
      next_eligible_at: null,
    });

    run = await store.updateRun(run.id, {
      opportunity_id: opportunity.id,
      selected_reason: selectedReason,
      status: "STARTED",
    });

    await store.updateOpportunity(opportunity.id, { status: "RESEARCHING" });
    const evidence = buildEvidencePackage(selected.record, now);

    let draft;
    const provider_metadata: ProviderMetadata = {
      provider: input.provider.id,
      mode: "DRY_RUN",
    };
    try {
      draft = await generateDraft({
        provider: input.provider,
        evidence,
        opportunity: selected,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Draft provider failed.";
      const failed = await store.updateOpportunity(opportunity.id, { status: "ERROR" });
      return finish(
        {
          status: "ERROR",
          opportunity_id: failed.id,
          selected_reason: selectedReason,
          evidence_snapshot: evidence,
          error_message: message,
          provider_metadata,
        },
        {
          opportunity: failed,
          evidence,
          draft: null,
          validation: null,
          candidates_considered: discovered.candidates.length,
          skipped: discovered.skipped,
        },
      );
    }

    await store.updateOpportunity(opportunity.id, { status: "DRAFTED" });
    const validation = validateDraft({
      draft,
      evidence,
      known_routes: input.context.known_routes,
      duplicates: input.context.duplicates,
      own_slug: selected.proposed_slug,
      own_titles: [
        selected.record.program.name,
        selected.record.program.consumer_headline ?? "",
        selected.record.content?.seo_title ?? "",
        selected.proposed_title,
      ],
    });

    const opportunityStatus = opportunityStatusAfterValidation(validation.passed);
    const updated = await store.updateOpportunity(opportunity.id, {
      status: opportunityStatus,
    });

    return finish(
      {
        status: runStatusAfterValidation(validation.passed),
        opportunity_id: updated.id,
        selected_reason: selectedReason,
        evidence_snapshot: evidence,
        draft_snapshot: draft,
        validation_snapshot: validation,
        error_message: validation.passed
          ? null
          : validation.errors.map((error) => error.code).join(", "),
        provider_metadata,
      },
      {
        opportunity: updated,
        evidence,
        draft,
        validation,
        candidates_considered: discovered.candidates.length,
        skipped: discovered.skipped,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Content pipeline failed.";
    return finish(
      {
        status: "ERROR",
        error_message: message,
      },
      {
        opportunity: null,
        evidence: null,
        draft: null,
        validation: null,
        candidates_considered: 0,
        skipped: [],
      },
    );
  }
}
