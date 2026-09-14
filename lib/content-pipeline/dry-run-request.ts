import { buildCatalogContext } from "@/lib/content-pipeline/catalog";
import { authorizeContentPipelineRequest } from "@/lib/content-pipeline/auth";
import { getDraftProviderId } from "@/lib/content-pipeline/config";
import { createContentDraftProvider } from "@/lib/content-pipeline/generate-draft";
import { runDryRunContentPipeline } from "@/lib/content-pipeline/run-pipeline";
import { getMemoryContentPipelineStore } from "@/lib/content-pipeline/store";
import { toDryRunSummary } from "@/lib/content-pipeline/summary";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function handleContentPipelineDryRunRequest(
  request: Request,
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
    const provider = createContentDraftProvider(getDraftProviderId());
    const result = await runDryRunContentPipeline({
      context: buildCatalogContext(),
      provider,
      store: getMemoryContentPipelineStore(),
    });
    return Response.json(toDryRunSummary(result, { includeSnapshots }));
  } catch {
    return Response.json(
      { error: "content_pipeline_failed", published: false },
      { status: 500 },
    );
  }
}
