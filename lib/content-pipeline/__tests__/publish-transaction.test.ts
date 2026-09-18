import { describe, expect, it, beforeAll, beforeEach } from "vitest";
import { persistPublishedGuideTransaction } from "@/lib/content-pipeline/publish-transaction";
import type {
  InMemoryPublishState,
} from "@/lib/content-pipeline/publish-transaction";
import type { PublishFailAt, PublishGuideWrite } from "@/lib/content-pipeline/publish-store";
import { PublishConflictError } from "@/lib/content-pipeline/publish-store";
import { createPostgresPublishHarness } from "./pglite-publish";

const PROGRAM_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OPPORTUNITY_ID = "11111111-1111-4111-8111-111111111111";
const GUIDE_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_GUIDE_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const FIRST_AT = "2026-09-14T00:00:00.000Z";
const RETRY_AT = "2026-09-15T00:00:00.000Z";

function write(overrides: Partial<PublishGuideWrite> = {}): PublishGuideWrite {
  return {
    id: GUIDE_ID,
    opportunity_id: OPPORTUNITY_ID,
    program_id: PROGRAM_ID,
    title: "Test Home Rebate",
    slug: "test-home-rebate",
    seo_title: "Test Home Rebate",
    meta_description: "A test rebate guide",
    excerpt: "A test rebate",
    body: "Overview\n\nA test rebate.",
    published_at: FIRST_AT,
    ...overrides,
  };
}

type AtomicHarness = {
  name: string;
  setup: () => Promise<void>;
  seed: (payload?: PublishGuideWrite, extra?: { collidingGuideId?: string }) => Promise<void>;
  seedPublished: (payload?: PublishGuideWrite) => Promise<{ publishedAt: string | null }>;
  publish: (
    payload?: PublishGuideWrite,
    failAt?: PublishFailAt | null,
  ) => Promise<{ ok: true; created: boolean; publishedAt: string | null; guideId: string } | { ok: false; message: string }>;
  snapshot: () => Promise<{
    guideCount: number;
    relationshipCount: number;
    opportunityGuideId: string | null;
    publishedAt: string | null;
    programIds: string[];
  }>;
};

function emptyMemoryState(): InMemoryPublishState {
  return {
    guides: new Map(),
    guidePrograms: new Map(),
    opportunityGuideIds: new Map(),
  };
}

function createMemoryHarness(): AtomicHarness {
  let state = emptyMemoryState();

  function snapshotNow() {
    const guide = state.guides.get(GUIDE_ID) ?? [...state.guides.values()][0];
    return {
      guideCount: state.guides.size,
      relationshipCount: [...state.guidePrograms.values()].reduce(
        (sum, ids) => sum + ids.length,
        0,
      ),
      opportunityGuideId: state.opportunityGuideIds.get(OPPORTUNITY_ID) ?? null,
      publishedAt: guide?.published_at ?? null,
      programIds: state.guidePrograms.get(guide?.id ?? GUIDE_ID) ?? [],
    };
  }

  return {
    name: "in-memory transaction",
    async setup() {
      state = emptyMemoryState();
    },
    async seed(payload = write(), extra) {
      state = emptyMemoryState();
      state.opportunityGuideIds.set(payload.opportunity_id, null);
      if (extra?.collidingGuideId) {
        state.guides.set(extra.collidingGuideId, {
          id: extra.collidingGuideId,
          title: "Other",
          slug: payload.slug,
          seo_title: "Other",
          meta_description: "Other",
          excerpt: "Other",
          body: "Other",
          published: true,
          published_at: payload.published_at,
          created_at: payload.published_at,
          updated_at: payload.published_at,
        });
      }
    },
    async seedPublished(payload = write()) {
      await this.seed(payload);
      const first = await this.publish(payload);
      if (!first.ok) {
        throw new Error(first.message);
      }
      return { publishedAt: first.publishedAt };
    },
    async publish(payload = write(), failAt = null) {
      try {
        const result = persistPublishedGuideTransaction(state, payload, {
          failAt,
          now: payload.published_at,
        });
        return {
          ok: true,
          created: result.created,
          publishedAt: result.guide.published_at,
          guideId: result.guide.id,
        };
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : "publish failed",
        };
      }
    },
    async snapshot() {
      return snapshotNow();
    },
  };
}

describe("atomic publication write", () => {
  const postgres = {
    harness: null as Awaited<ReturnType<typeof createPostgresPublishHarness>> | null,
  };

  beforeAll(async () => {
    postgres.harness = await createPostgresPublishHarness();
    const source = await postgres.harness.functionSource();
    expect(source).toContain("FOR UPDATE");
    expect(source).toContain("DELETE FROM public.guide_programs");
    expect(source).toContain("INSERT INTO public.guide_programs");
    expect(source).toContain("UPDATE public.content_opportunities");
    const constraints = await postgres.harness.constraintNames();
    expect(constraints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ conname: "guides_pkey", contype: "p" }),
        expect.objectContaining({ conname: "guides_slug_key", contype: "u" }),
        expect.objectContaining({ conname: "guide_programs_pkey", contype: "p" }),
      ]),
    );
  }, 30000);

  function postgresHarness(): AtomicHarness {
    const db = postgres.harness!;
    return {
      name: "postgres RPC",
      async setup() {
        await db.reset();
      },
      async seed(payload = write(), extra) {
        await db.seed(payload, extra);
      },
      async seedPublished(payload = write()) {
        const first = await db.seedPublished(payload);
        return { publishedAt: first.publishedAt };
      },
      async publish(payload = write(), failAt = null) {
        return db.publish(payload, failAt);
      },
      async snapshot() {
        const snap = await db.snapshot(OPPORTUNITY_ID);
        const publishedAt = snap.guides[0]?.published_at;
        return {
          guideCount: snap.guides.length,
          relationshipCount: snap.guidePrograms.length,
          opportunityGuideId: snap.opportunityGuideId,
          publishedAt:
            publishedAt instanceof Date
              ? publishedAt.toISOString()
              : publishedAt == null
                ? null
                : new Date(String(publishedAt)).toISOString(),
          programIds: snap.guidePrograms.map((row) => String(row.program_id)),
        };
      },
    };
  }

  const cases: Array<{ name: string; create: () => AtomicHarness }> = [
    { name: "postgres RPC", create: postgresHarness },
    { name: "in-memory transaction", create: createMemoryHarness },
  ];

  describe.each(cases)("$name", ({ create }) => {
    let harness: AtomicHarness;

    beforeEach(async () => {
      harness = create();
      await harness.setup();
    });

    it("rolls back a newly published guide if guide_programs cannot be established", async () => {
      await harness.seed();
      const result = await harness.publish(write(), "guide_programs");
      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error("expected injected failure");
      }
      expect(result.message).toContain("injected_failure_guide_programs");
      const snap = await harness.snapshot();
      expect(snap.guideCount).toBe(0);
      expect(snap.relationshipCount).toBe(0);
      expect(snap.opportunityGuideId).toBeNull();
    });

    it("rolls back guide and relationship changes if opportunity attachment fails", async () => {
      await harness.seed();
      const result = await harness.publish(write(), "opportunity_attach");
      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error("expected injected failure");
      }
      expect(result.message).toContain("injected_failure_opportunity_attach");
      const snap = await harness.snapshot();
      expect(snap.guideCount).toBe(0);
      expect(snap.relationshipCount).toBe(0);
      expect(snap.opportunityGuideId).toBeNull();
    });

    it("retries cleanly after a simulated failed transaction", async () => {
      await harness.seed();
      const failed = await harness.publish(write(), "guide_programs");
      expect(failed.ok).toBe(false);
      const retried = await harness.publish(write());
      expect(retried.ok).toBe(true);
      if (!retried.ok) {
        throw new Error(retried.message);
      }
      expect(retried.created).toBe(true);
      const snap = await harness.snapshot();
      expect(snap.guideCount).toBe(1);
      expect(snap.relationshipCount).toBe(1);
      expect(snap.opportunityGuideId).toBe(GUIDE_ID);
      expect(snap.programIds).toEqual([PROGRAM_ID]);
    });

    it("produces one guide and one relationship for concurrent first-publish attempts", async () => {
      await harness.seed();
      const payload = write();
      const [left, right] = await Promise.all([
        harness.publish(payload),
        harness.publish(payload),
      ]);
      expect(left.ok).toBe(true);
      expect(right.ok).toBe(true);
      if (!left.ok || !right.ok) {
        throw new Error("concurrent publish failed");
      }
      expect(new Set([left.guideId, right.guideId])).toEqual(new Set([GUIDE_ID]));
      expect([left.created, right.created].filter(Boolean).length).toBeGreaterThanOrEqual(1);
      const snap = await harness.snapshot();
      expect(snap.guideCount).toBe(1);
      expect(snap.relationshipCount).toBe(1);
      expect(snap.opportunityGuideId).toBe(GUIDE_ID);
      expect(snap.programIds).toEqual([PROGRAM_ID]);
    });

    it("preserves published_at when retrying an already-published guide", async () => {
      const first = await harness.seedPublished();
      const retry = await harness.publish(write({ published_at: RETRY_AT, body: "Updated body" }));
      expect(retry.ok).toBe(true);
      if (!retry.ok) {
        throw new Error(retry.message);
      }
      expect(retry.created).toBe(false);
      expect(retry.publishedAt).toBe(first.publishedAt);
      const snap = await harness.snapshot();
      expect(snap.publishedAt).toBe(first.publishedAt);
      expect(snap.guideCount).toBe(1);
      expect(snap.relationshipCount).toBe(1);
    });

    it("does not delete an existing relationship if an update transaction fails", async () => {
      await harness.seedPublished();
      const before = await harness.snapshot();
      expect(before.relationshipCount).toBe(1);
      const failed = await harness.publish(
        write({ published_at: RETRY_AT, body: "Should not commit" }),
        "guide_programs_insert",
      );
      expect(failed.ok).toBe(false);
      const after = await harness.snapshot();
      expect(after.guideCount).toBe(1);
      expect(after.relationshipCount).toBe(1);
      expect(after.opportunityGuideId).toBe(GUIDE_ID);
      expect(after.programIds).toEqual([PROGRAM_ID]);
      expect(after.publishedAt).toBe(before.publishedAt);
    });

    it("rolls back everything on a slug collision with another guide", async () => {
      await harness.seed(write(), { collidingGuideId: OTHER_GUIDE_ID });
      const result = await harness.publish(write());
      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error("expected slug conflict");
      }
      expect(
        result.message.includes("guide_slug_conflict") ||
          result.message.includes("A different guide already uses this slug."),
      ).toBe(true);
      const snap = await harness.snapshot();
      expect(snap.guideCount).toBe(1);
      expect(snap.relationshipCount).toBe(0);
      expect(snap.opportunityGuideId).toBeNull();
    });
  });

  it("maps in-memory slug collisions to PublishConflictError", () => {
    const state: InMemoryPublishState = {
      guides: new Map([
        [
          OTHER_GUIDE_ID,
          {
            id: OTHER_GUIDE_ID,
            title: "Other",
            slug: "test-home-rebate",
            seo_title: "Other",
            meta_description: "Other",
            excerpt: "Other",
            body: "Other",
            published: true,
            published_at: FIRST_AT,
            created_at: FIRST_AT,
            updated_at: FIRST_AT,
          },
        ],
      ]),
      guidePrograms: new Map(),
      opportunityGuideIds: new Map([[OPPORTUNITY_ID, null]]),
    };
    expect(() => persistPublishedGuideTransaction(state, write())).toThrow(PublishConflictError);
    expect(state.guides.size).toBe(1);
    expect(state.opportunityGuideIds.get(OPPORTUNITY_ID)).toBeNull();
  });
});
