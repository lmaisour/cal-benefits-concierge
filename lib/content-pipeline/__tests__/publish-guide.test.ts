import { describe, expect, it } from "vitest";
import { breadcrumbJsonLd, webPageJsonLd } from "@/lib/seo/json-ld";
import { siteConfig } from "@/lib/config/site";
import { FakeContentDraftProvider } from "@/lib/content-pipeline/generate-draft";
import { MemoryGuidePublishStore } from "@/lib/content-pipeline/memory-publish-store";
import {
  PublishGuideError,
  mapDraftToGuideFields,
  publishGuide,
} from "@/lib/content-pipeline/publish-guide";
import { runDryRunContentPipeline } from "@/lib/content-pipeline/run-pipeline";
import { MemoryContentPipelineStore } from "@/lib/content-pipeline/store";
import { SupabaseGuidePublishStore } from "@/lib/content-pipeline/supabase-publish-store";
import { publishedGuideId } from "@/lib/content-pipeline/ids";
import type { ContentDraft, ContentPipelineRunRecord } from "@/lib/content-pipeline/types";
import { createFakeSupabase } from "./fake-supabase";
import { FIXTURE_PROGRAM_ID, makeRecord, NOW } from "./fixtures";

const knownRoutes = [
  "/",
  "/check",
  "/results",
  "/programs",
  "/guides",
  "/programs/test-home-rebate",
];

const EXTRA_PROGRAM_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const EXTRA_GUIDE_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function context(records = [makeRecord()]) {
  return {
    records,
    known_routes: knownRoutes,
    duplicates: {
      slugs: records.map((record) => record.program.slug),
      titles: records.map((record) => record.program.name),
    },
  };
}

async function completedRun(store = new MemoryContentPipelineStore()) {
  const result = await runDryRunContentPipeline({
    context: context(),
    provider: new FakeContentDraftProvider(),
    store,
    now: NOW,
  });
  return { store, result };
}

function publishStore(pipeline: MemoryContentPipelineStore, programs = [FIXTURE_PROGRAM_ID]) {
  return new MemoryGuidePublishStore(pipeline, new Set(programs));
}

describe("publishGuide", () => {
  it("publishes a validated dry-run draft into the existing guide model", async () => {
    const { store, result } = await completedRun();
    expect(result.published).toBe(false);
    const published = await publishGuide({
      runId: result.run.id,
      store: publishStore(store),
      now: NOW,
      enabled: true,
    });
    expect(published.created).toBe(true);
    expect(published.guide.published).toBe(true);
    expect(published.guide.published_at).toBe(NOW.toISOString());
    expect(published.guide.title).toBe(result.draft?.h1);
    expect(published.guide.seo_title).toBe(result.draft?.seo_title);
    expect(published.guide.meta_description).toBe(result.draft?.meta_description);
    expect(published.guide.excerpt).toBe(result.draft?.dek);
    expect(published.guide.slug).toBe(result.opportunity?.proposed_slug);
    expect(published.guide.body).toContain("Overview");
    expect(published.guide.body).toContain(result.draft?.overview ?? "missing");
    expect(published.guide.body).toContain("What you get");
    expect(published.guide.body).toContain("Who may qualify");
    expect(published.guide.body).toContain("How to apply");
    expect(published.guide.body).toContain("Documents");
    expect(published.guide.body).toContain("Important notes");
    expect(published.guide.body).toContain("FAQs");
    expect(published.guide.body).toContain(result.draft?.faqs[0]?.question ?? "missing");
    if (result.draft?.suggested_official_cta) {
      expect(published.guide.body).toContain(result.draft.suggested_official_cta.href);
    }
    expect(store.opportunities.values().next().value?.guide_id).toBe(published.guide.id);
    expect(published.guide.id).toBe(publishedGuideId(result.opportunity!.id));
  });

  it("retries the same run without creating a second guide", async () => {
    const { store, result } = await completedRun();
    const publisher = publishStore(store);
    const first = await publishGuide({
      runId: result.run.id,
      store: publisher,
      now: NOW,
      enabled: true,
    });
    const second = await publishGuide({
      runId: result.run.id,
      store: publisher,
      now: new Date("2026-09-15T00:00:00.000Z"),
      enabled: true,
    });
    expect(second.created).toBe(false);
    expect(second.guide.id).toBe(first.guide.id);
    expect(second.guide.published_at).toBe(first.guide.published_at);
    expect(publisher.guides.size).toBe(1);
    expect(publisher.guidePrograms.get(first.guide.id)).toEqual([FIXTURE_PROGRAM_ID]);
  });

  it("does not create duplicates when two publishes race", async () => {
    const { store, result } = await completedRun();
    const publisher = publishStore(store);
    const [left, right] = await Promise.all([
      publishGuide({ runId: result.run.id, store: publisher, now: NOW, enabled: true }),
      publishGuide({ runId: result.run.id, store: publisher, now: NOW, enabled: true }),
    ]);
    expect(new Set([left.guide.id, right.guide.id]).size).toBe(1);
    expect(publisher.guides.size).toBe(1);
  });

  it("keeps the published guide identity when a later dry-run reuses the opportunity", async () => {
    const { store, result } = await completedRun();
    const publisher = publishStore(store);
    const published = await publishGuide({
      runId: result.run.id,
      store: publisher,
      now: NOW,
      enabled: true,
    });
    const again = await runDryRunContentPipeline({
      context: context(),
      provider: new FakeContentDraftProvider(),
      store,
      now: NOW,
    });
    expect(again.opportunity?.id).toBe(result.opportunity?.id);
    expect(again.opportunity?.guide_id).toBe(published.guide.id);
    expect(again.published).toBe(false);
  });

  it("preserves validated content and does not mutate unrelated rows", async () => {
    const pipeline = new MemoryContentPipelineStore();
    const extra = await pipeline.createRun({
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      started_at: NOW.toISOString(),
    });
    const { result } = await completedRun(pipeline);
    const publisher = publishStore(pipeline, [FIXTURE_PROGRAM_ID, EXTRA_PROGRAM_ID]);
    publisher.guides.set(EXTRA_GUIDE_ID, {
      id: EXTRA_GUIDE_ID,
      title: "Manual guide",
      slug: "manual-guide",
      seo_title: "Manual",
      meta_description: "Manual excerpt",
      excerpt: "Manual excerpt",
      body: "Do not touch",
      published: true,
      published_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    const published = await publishGuide({
      runId: result.run.id,
      store: publisher,
      now: NOW,
      enabled: true,
    });
    expect(published.guide.body).toContain(result.draft?.overview ?? "missing");
    expect(publisher.guides.get(EXTRA_GUIDE_ID)?.body).toBe("Do not touch");
    expect(pipeline.runs.get(extra.id)?.status).toBe("STARTED");
    expect(pipeline.runs.get(extra.id)?.draft_snapshot).toBeNull();
    expect(published.program_id).toBe(FIXTURE_PROGRAM_ID);
    expect(published.program_id).not.toBe(EXTRA_PROGRAM_ID);
  });

  it("rejects a missing run", async () => {
    const pipeline = new MemoryContentPipelineStore();
    await expect(
      publishGuide({
        runId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        store: publishStore(pipeline),
        enabled: true,
      }),
    ).rejects.toMatchObject({ code: "run_not_found" });
  });

  it("rejects ERROR, incomplete, missing-draft, and failed validation runs", async () => {
    const pipeline = new MemoryContentPipelineStore();
    const errored = await pipeline.createRun({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      started_at: NOW.toISOString(),
    });
    await pipeline.updateRun(errored.id, { status: "ERROR", error_message: "boom" });
    await expect(
      publishGuide({ runId: errored.id, store: publishStore(pipeline), enabled: true }),
    ).rejects.toMatchObject({ code: "run_error" });

    const incomplete = await pipeline.createRun({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
      started_at: NOW.toISOString(),
    });
    await expect(
      publishGuide({ runId: incomplete.id, store: publishStore(pipeline), enabled: true }),
    ).rejects.toMatchObject({ code: "run_incomplete" });

    const { store, result } = await completedRun();
    const run = store.runs.get(result.run.id) as ContentPipelineRunRecord;
    store.runs.set(result.run.id, { ...run, draft_snapshot: null });
    await expect(
      publishGuide({ runId: result.run.id, store: publishStore(store), enabled: true }),
    ).rejects.toMatchObject({ code: "missing_draft" });

    const failed = await completedRun();
    const failedRun = failed.store.runs.get(failed.result.run.id)!;
    failed.store.runs.set(failed.result.run.id, {
      ...failedRun,
      status: "BLOCKED",
      validation_snapshot: {
        passed: false,
        errors: [
          {
            passed: false,
            code: "UNSUPPORTED_ELIGIBILITY",
            message: "no",
          },
        ],
        warnings: [],
      },
    });
    await expect(
      publishGuide({
        runId: failed.result.run.id,
        store: publishStore(failed.store),
        enabled: true,
      }),
    ).rejects.toMatchObject({ code: "validation_failed" });

    const blocking = await completedRun();
    const blockingRun = blocking.store.runs.get(blocking.result.run.id)!;
    blocking.store.runs.set(blocking.result.run.id, {
      ...blockingRun,
      validation_snapshot: {
        passed: true,
        errors: [
          {
            passed: false,
            code: "UNSUPPORTED_AMOUNT",
            message: "blocking",
          },
        ],
        warnings: [],
      },
    });
    await expect(
      publishGuide({
        runId: blocking.result.run.id,
        store: publishStore(blocking.store),
        enabled: true,
      }),
    ).rejects.toMatchObject({ code: "blocking_validation_error" });
  });

  it("rejects inconsistent program/opportunity identity and malformed slug/content", async () => {
    const mismatched = await completedRun();
    const mismatchRun = mismatched.store.runs.get(mismatched.result.run.id)!;
    mismatched.store.runs.set(mismatched.result.run.id, {
      ...mismatchRun,
      evidence_snapshot: mismatchRun.evidence_snapshot
        ? { ...mismatchRun.evidence_snapshot, program_id: EXTRA_PROGRAM_ID }
        : null,
    });
    await expect(
      publishGuide({
        runId: mismatched.result.run.id,
        store: publishStore(mismatched.store, [FIXTURE_PROGRAM_ID, EXTRA_PROGRAM_ID]),
        enabled: true,
      }),
    ).rejects.toMatchObject({ code: "identity_mismatch" });

    const missingProgram = await completedRun();
    await expect(
      publishGuide({
        runId: missingProgram.result.run.id,
        store: publishStore(missingProgram.store, []),
        enabled: true,
      }),
    ).rejects.toMatchObject({ code: "program_not_found" });

    const slug = await completedRun();
    const opportunity = [...slug.store.opportunities.values()][0];
    slug.store.opportunities.set(`${opportunity.opportunity_type}:${opportunity.program_id}`, {
      ...opportunity,
      proposed_slug: "Not a slug",
    });
    await expect(
      publishGuide({
        runId: slug.result.run.id,
        store: publishStore(slug.store),
        enabled: true,
      }),
    ).rejects.toMatchObject({ code: "malformed_slug" });

    const malformed = await completedRun();
    const malformedRun = malformed.store.runs.get(malformed.result.run.id)!;
    const blankDraft = {
      ...(malformedRun.draft_snapshot as ContentDraft),
      h1: "   ",
      seo_title: "   ",
      dek: "   ",
      overview: "",
      what_you_get: "",
      who_may_qualify: "",
      how_to_apply: "",
      documents: "",
      important_notes: "",
      faqs: [],
      suggested_internal_links: [],
      suggested_official_cta: null,
    };
    malformed.store.runs.set(malformed.result.run.id, {
      ...malformedRun,
      draft_snapshot: blankDraft,
    });
    await expect(
      publishGuide({
        runId: malformed.result.run.id,
        store: publishStore(malformed.store),
        enabled: true,
      }),
    ).rejects.toMatchObject({ code: "malformed_content" });
  });

  it("rejects publication when the kill switch is off", async () => {
    const { store, result } = await completedRun();
    await expect(
      publishGuide({
        runId: result.run.id,
        store: publishStore(store),
        enabled: false,
      }),
    ).rejects.toBeInstanceOf(PublishGuideError);
    await expect(
      publishGuide({
        runId: result.run.id,
        store: publishStore(store),
        enabled: false,
      }),
    ).rejects.toMatchObject({ code: "publish_disabled" });
  });

  it("maps draft fields onto the public guide rendering contract", async () => {
    const { result } = await completedRun();
    const mapped = mapDraftToGuideFields(result.draft!, result.opportunity!);
    const path = `${siteConfig.urls.guides}/${mapped.slug}`;
    const jsonLd = webPageJsonLd({
      name: mapped.seo_title,
      description: mapped.meta_description,
      path,
    });
    const crumbs = breadcrumbJsonLd([
      { name: "Home", path: siteConfig.urls.home },
      { name: "Guides", path: siteConfig.urls.guides },
      { name: mapped.title, path },
    ]);
    expect(jsonLd.name).toBe(result.draft?.seo_title);
    expect(jsonLd.description).toBe(result.draft?.meta_description);
    expect(crumbs.itemListElement).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: result.draft?.h1 })]),
    );
    expect(mapped.body).toContain(result.draft?.how_to_apply ?? "missing");
    expect(mapped.body).toContain(result.draft?.who_may_qualify ?? "missing");
  });

  it("publishes through the supabase-backed store without touching unrelated tables", async () => {
    const client = createFakeSupabase({
      tables: {
        programs: [{ id: FIXTURE_PROGRAM_ID, slug: "test-home-rebate" }],
        program_content: [{ program_id: EXTRA_PROGRAM_ID, overview: "leave me" }],
      },
    });
    const pipeline = new (await import("@/lib/content-pipeline/supabase-store")).SupabaseContentPipelineStore(
      client,
    );
    const result = await runDryRunContentPipeline({
      context: context(),
      provider: new FakeContentDraftProvider(),
      store: pipeline,
      now: NOW,
    });
    const publisher = new SupabaseGuidePublishStore(client);
    const published = await publishGuide({
      runId: result.run.id,
      store: publisher,
      now: NOW,
      enabled: true,
    });
    expect(client.tables.guides).toHaveLength(1);
    expect(client.tables.guides[0]?.published).toBe(true);
    expect(client.tables.guide_programs).toEqual([
      expect.objectContaining({
        guide_id: published.guide.id,
        program_id: FIXTURE_PROGRAM_ID,
      }),
    ]);
    expect(client.tables.program_content).toHaveLength(1);
    expect(client.tables.program_content[0]?.overview).toBe("leave me");
    const retry = await publishGuide({
      runId: result.run.id,
      store: publisher,
      now: NOW,
      enabled: true,
    });
    expect(retry.created).toBe(false);
    expect(client.tables.guides).toHaveLength(1);
  });
});
