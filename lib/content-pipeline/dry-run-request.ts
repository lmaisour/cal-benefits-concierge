import { authorizeContentPipelineRequest } from "@/lib/content-pipeline/auth";
import { LivePipelineLoadError } from "@/lib/content-pipeline/live-context";
import type { PipelineRuntime } from "@/lib/content-pipeline/live-runtime";
import { runDryRunContentPipeline } from "@/lib/content-pipeline/run-pipeline";
import { toDryRunSummary } from "@/lib/content-pipeline/summary";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type CreatePipelineRuntime = () => Promise<PipelineRuntime>;

export async function handleContentPipelineDryRunRequest(
  request: Request,
  createRuntime: CreatePipelineRuntime,
): Promise<Response> {
  const auth = authorizeContentPipelineRequest(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error, published: false }, { status: auth.status });
  }

  let includeSnapshots = false;
  if (request.method !== "GET") {
    try {
      const body: unknown = await request.json();
      includeSnapshots = isPlainObject(body) && body.include_snapshots === true;
    } catch {
      includeSnapshots = false;
    }
  }

  try {
    const runtime = await createRuntime();
    const result = await runDryRunContentPipeline({
      context: runtime.context,
      provider: runtime.provider,
      store: runtime.store,
    });
    return Response.json(toDryRunSummary(result, { includeSnapshots }));
  } catch (error) {
    const message =
      error instanceof LivePipelineLoadError
        ? error.message
        : error instanceof Error
          ? error.message
          : "content_pipeline_failed";
    return Response.json(
      {
        error: message,
        status: "ERROR",
        published: false,
        selected_opportunity: null,
        validation: null,
      },
      { status: 500 },
    );
  }
}
