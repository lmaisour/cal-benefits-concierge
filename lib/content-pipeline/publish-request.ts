import { authorizeContentPipelineRequest } from "@/lib/content-pipeline/auth";
import { isContentPipelinePublishEnabled } from "@/lib/content-pipeline/config";
import {
  PublishGuideError,
  publishGuide,
} from "@/lib/content-pipeline/publish-guide";
import type { GuidePublishStore } from "@/lib/content-pipeline/publish-store";

function isPlainObject(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type CreatePublishStore = () => Promise<GuidePublishStore>;

const ERROR_STATUS: Record<string, number> = {
  publish_disabled: 403,
  run_not_found: 404,
  run_error: 409,
  run_incomplete: 409,
  run_mode_unsupported: 409,
  missing_draft: 409,
  validation_failed: 409,
  blocking_validation_error: 409,
  opportunity_not_found: 409,
  program_not_found: 409,
  identity_mismatch: 409,
  malformed_slug: 422,
  malformed_content: 422,
  guide_slug_conflict: 409,
  guide_missing: 409,
};

export async function handleContentPipelinePublishRequest(
  request: Request,
  createStore: CreatePublishStore,
): Promise<Response> {
  const auth = authorizeContentPipelineRequest(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error, published: false }, { status: auth.status });
  }
  if (!isContentPipelinePublishEnabled()) {
    return Response.json(
      { error: "content_pipeline_publish_disabled", published: false },
      { status: 403 },
    );
  }

  let runId = "";
  try {
    const body: unknown = await request.json();
    if (isPlainObject(body) && typeof (body as { run_id?: unknown }).run_id === "string") {
      runId = (body as { run_id: string }).run_id;
    }
  } catch {
    runId = "";
  }
  if (!runId.trim()) {
    return Response.json(
      { error: "run_not_found", published: false },
      { status: 404 },
    );
  }

  try {
    const store = await createStore();
    const result = await publishGuide({
      runId,
      store,
      enabled: true,
    });
    return Response.json({
      published: true,
      created: result.created,
      guide_id: result.guide.id,
      slug: result.guide.slug,
      run_id: result.run_id,
      opportunity_id: result.opportunity_id,
      program_id: result.program_id,
    });
  } catch (error) {
    if (error instanceof PublishGuideError) {
      return Response.json(
        { error: error.code, published: false },
        { status: ERROR_STATUS[error.code] ?? 409 },
      );
    }
    console.error("content_pipeline_publish_failed", error);
    return Response.json(
      { error: "content_pipeline_publish_failed", published: false },
      { status: 500 },
    );
  }
}
