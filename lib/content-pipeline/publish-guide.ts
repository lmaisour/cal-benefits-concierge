import { publishedGuideId } from "@/lib/content-pipeline/ids";
import type {
  ContentDraft,
  ContentOpportunityRecord,
  ContentPipelineRunRecord,
  EvidencePackage,
  ValidationResult,
} from "@/lib/content-pipeline/types";
import type { GuidePublishStore, PublishedGuideRecord } from "@/lib/content-pipeline/publish-store";
import { PublishConflictError } from "@/lib/content-pipeline/publish-store";

const GUIDE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PUBLISHABLE_RUN_MODE = "DRY_RUN" as const;

export type PublishErrorCode =
  | "publish_disabled"
  | "run_not_found"
  | "run_error"
  | "run_incomplete"
  | "run_mode_unsupported"
  | "missing_draft"
  | "validation_failed"
  | "blocking_validation_error"
  | "opportunity_not_found"
  | "program_not_found"
  | "identity_mismatch"
  | "malformed_slug"
  | "malformed_content"
  | "guide_slug_conflict"
  | "guide_missing";

export class PublishGuideError extends Error {
  readonly code: PublishErrorCode;

  constructor(code: PublishErrorCode, message: string) {
    super(message);
    this.name = "PublishGuideError";
    this.code = code;
  }
}

export type PublishGuideInput = {
  runId: string;
  store: GuidePublishStore;
  now?: Date;
  enabled?: boolean;
};

export type PublishGuideResult = {
  guide: PublishedGuideRecord;
  created: boolean;
  program_id: string;
  run_id: string;
  opportunity_id: string;
};

export type MappedGuideFields = {
  title: string;
  slug: string;
  seo_title: string;
  meta_description: string;
  excerpt: string;
  body: string;
};

export function mapDraftToGuideFields(
  draft: ContentDraft,
  opportunity: Pick<ContentOpportunityRecord, "proposed_slug">,
): MappedGuideFields {
  return {
    title: draft.h1.trim(),
    slug: opportunity.proposed_slug.trim().toLowerCase(),
    seo_title: draft.seo_title.trim(),
    meta_description: draft.meta_description.trim(),
    excerpt: draft.dek.trim(),
    body: serializeGuideBody(draft),
  };
}

export function serializeGuideBody(draft: ContentDraft): string {
  const parts: string[] = [];
  const sections: Array<[string, string]> = [
    ["Overview", draft.overview],
    ["What you get", draft.what_you_get],
    ["Who may qualify", draft.who_may_qualify],
    ["How to apply", draft.how_to_apply],
    ["Documents", draft.documents],
    ["Important notes", draft.important_notes],
  ];
  for (const [heading, text] of sections) {
    if (text.trim()) {
      parts.push(`${heading}\n\n${text.trim()}`);
    }
  }
  if (draft.faqs.length > 0) {
    parts.push(
      `FAQs\n\n${draft.faqs
        .map((faq, index) => `${index + 1}. ${faq.question.trim()}\n${faq.answer.trim()}`)
        .join("\n\n")}`,
    );
  }
  if (draft.suggested_official_cta) {
    parts.push(
      `Official source\n\n${draft.suggested_official_cta.label.trim()}\n${draft.suggested_official_cta.href.trim()}`,
    );
  }
  if (draft.suggested_internal_links.length > 0) {
    parts.push(
      `Related\n\n${draft.suggested_internal_links
        .map((link) => `${link.label.trim()}\n${link.href.trim()}`)
        .join("\n")}`,
    );
  }
  return parts.join("\n\n");
}

export async function publishGuide(input: PublishGuideInput): Promise<PublishGuideResult> {
  if (input.enabled === false) {
    throw new PublishGuideError("publish_disabled", "Guide publication is disabled.");
  }

  const runId = input.runId.trim();
  if (!UUID_PATTERN.test(runId)) {
    throw new PublishGuideError("run_not_found", "Pipeline run was not found.");
  }

  const run = await input.store.getRun(runId);
  if (!run) {
    throw new PublishGuideError("run_not_found", "Pipeline run was not found.");
  }
  assertRunReady(run);

  if (!run.opportunity_id) {
    throw new PublishGuideError(
      "identity_mismatch",
      "Pipeline run is not attached to an opportunity.",
    );
  }

  const opportunity = await input.store.getOpportunity(run.opportunity_id);
  if (!opportunity) {
    throw new PublishGuideError("opportunity_not_found", "Content opportunity was not found.");
  }
  if (opportunity.id !== run.opportunity_id) {
    throw new PublishGuideError(
      "identity_mismatch",
      "Pipeline run opportunity identity is inconsistent.",
    );
  }

  const evidence = run.evidence_snapshot;
  if (!evidence) {
    throw new PublishGuideError("run_incomplete", "Pipeline run is missing its evidence snapshot.");
  }
  assertIdentity(opportunity, evidence, run);

  if (!(await input.store.programExists(opportunity.program_id))) {
    throw new PublishGuideError("program_not_found", "Selected program no longer exists.");
  }

  const draft = run.draft_snapshot;
  if (!draft) {
    throw new PublishGuideError("missing_draft", "Pipeline run has no validated draft.");
  }
  assertValidation(run.validation_snapshot);

  const mapped = mapDraftToGuideFields(draft, opportunity);
  assertMappedFields(mapped);

  const now = (input.now ?? new Date()).toISOString();
  const guideId = opportunity.guide_id ?? publishedGuideId(opportunity.id);

  try {
    const persisted = await input.store.persistPublishedGuide({
      id: guideId,
      opportunity_id: opportunity.id,
      program_id: opportunity.program_id,
      title: mapped.title,
      slug: mapped.slug,
      seo_title: mapped.seo_title,
      meta_description: mapped.meta_description,
      excerpt: mapped.excerpt,
      body: mapped.body,
      published_at: now,
    });
    return {
      guide: persisted.guide,
      created: persisted.created,
      program_id: opportunity.program_id,
      run_id: run.id,
      opportunity_id: opportunity.id,
    };
  } catch (error) {
    if (error instanceof PublishConflictError && error.code === "guide_slug_conflict") {
      throw new PublishGuideError(
        "guide_slug_conflict",
        "A different guide already uses this slug.",
      );
    }
    if (error instanceof PublishConflictError && error.code === "guide_missing") {
      throw new PublishGuideError(
        "guide_missing",
        "Opportunity points at a guide that no longer exists.",
      );
    }
    throw error;
  }
}

function assertRunReady(run: ContentPipelineRunRecord): void {
  if (run.mode !== PUBLISHABLE_RUN_MODE) {
    throw new PublishGuideError(
      "run_mode_unsupported",
      `Pipeline run mode ${run.mode} is not publishable.`,
    );
  }
  if (run.status === "ERROR") {
    throw new PublishGuideError("run_error", "Pipeline run ended in ERROR.");
  }
  if (run.status === "STARTED" || !run.completed_at) {
    throw new PublishGuideError("run_incomplete", "Pipeline run is not complete.");
  }
  if (run.status !== "COMPLETED" && run.status !== "BLOCKED") {
    throw new PublishGuideError("run_incomplete", "Pipeline run is not complete.");
  }
}

function assertIdentity(
  opportunity: ContentOpportunityRecord,
  evidence: EvidencePackage,
  run: ContentPipelineRunRecord,
): void {
  if (!opportunity.program_id || !evidence.program_id) {
    throw new PublishGuideError(
      "identity_mismatch",
      "Program identity is missing from the opportunity or evidence snapshot.",
    );
  }
  if (opportunity.program_id !== evidence.program_id) {
    throw new PublishGuideError(
      "identity_mismatch",
      "Opportunity program does not match the evidence snapshot.",
    );
  }
  if (run.opportunity_id !== opportunity.id) {
    throw new PublishGuideError(
      "identity_mismatch",
      "Pipeline run opportunity identity is inconsistent.",
    );
  }
}

function assertValidation(validation: ValidationResult | null): void {
  if (!validation) {
    throw new PublishGuideError("run_incomplete", "Pipeline run is missing validation results.");
  }
  if (!validation.passed) {
    throw new PublishGuideError("validation_failed", "Validated draft did not pass.");
  }
  if (validation.errors.length > 0) {
    throw new PublishGuideError(
      "blocking_validation_error",
      "Validated draft still has blocking errors.",
    );
  }
}

function assertMappedFields(mapped: MappedGuideFields): void {
  if (!GUIDE_SLUG_PATTERN.test(mapped.slug)) {
    throw new PublishGuideError("malformed_slug", "Proposed guide slug is not publishable.");
  }
  if (
    !mapped.title ||
    !mapped.seo_title ||
    !mapped.meta_description ||
    !mapped.excerpt ||
    !mapped.body
  ) {
    throw new PublishGuideError("malformed_content", "Validated draft is missing required guide fields.");
  }
}
