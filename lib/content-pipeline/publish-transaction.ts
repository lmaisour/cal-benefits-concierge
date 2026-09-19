import type { GuideRow } from "@/types/database";
import { PublishConflictError } from "@/lib/content-pipeline/publish-store";
import type {
  PublishFailAt,
  PublishGuideWrite,
  PublishGuideWriteResult,
  PublishedGuideRecord,
} from "@/lib/content-pipeline/publish-store";

export type InMemoryPublishState = {
  guides: Map<string, GuideRow>;
  guidePrograms: Map<string, string[]>;
  opportunityGuideIds: Map<string, string | null>;
};

function toRecord(row: GuideRow): PublishedGuideRecord {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    seo_title: row.seo_title,
    meta_description: row.meta_description,
    excerpt: row.excerpt,
    body: row.body,
    published: row.published,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function cloneState(state: InMemoryPublishState): InMemoryPublishState {
  return {
    guides: new Map(
      [...state.guides.entries()].map(([id, row]) => [id, { ...row }]),
    ),
    guidePrograms: new Map(
      [...state.guidePrograms.entries()].map(([id, programIds]) => [id, [...programIds]]),
    ),
    opportunityGuideIds: new Map(state.opportunityGuideIds),
  };
}

function restoreState(target: InMemoryPublishState, snapshot: InMemoryPublishState): void {
  target.guides.clear();
  for (const [id, row] of snapshot.guides) {
    target.guides.set(id, { ...row });
  }
  target.guidePrograms.clear();
  for (const [id, programIds] of snapshot.guidePrograms) {
    target.guidePrograms.set(id, [...programIds]);
  }
  target.opportunityGuideIds.clear();
  for (const [id, guideId] of snapshot.opportunityGuideIds) {
    target.opportunityGuideIds.set(id, guideId);
  }
}

/**
 * In-memory replica of public.publish_content_guide. Callers must treat the
 * whole function as one transaction: on throw, this restores `state`.
 */
export function persistPublishedGuideTransaction(
  state: InMemoryPublishState,
  write: PublishGuideWrite,
  options: { failAt?: PublishFailAt | null; now?: string } = {},
): PublishGuideWriteResult {
  const snapshot = cloneState(state);
  try {
    return persistPublishedGuideUnlocked(state, write, options);
  } catch (error) {
    restoreState(state, snapshot);
    throw error;
  }
}

function persistPublishedGuideUnlocked(
  state: InMemoryPublishState,
  write: PublishGuideWrite,
  options: { failAt?: PublishFailAt | null; now?: string },
): PublishGuideWriteResult {
  if (!state.opportunityGuideIds.has(write.opportunity_id)) {
    throw new Error("opportunity_not_found");
  }

  const attachedGuideId = state.opportunityGuideIds.get(write.opportunity_id) ?? null;
  if (attachedGuideId && attachedGuideId !== write.id) {
    throw new Error("identity_mismatch");
  }

  const guideId = attachedGuideId ?? write.id;
  const existing = state.guides.get(guideId);
  const now = options.now ?? write.published_at;
  let created = false;
  let guide: GuideRow;

  if (existing) {
    assertSlugAvailable(state, write.slug, guideId);
    guide = {
      ...existing,
      title: write.title,
      slug: write.slug,
      seo_title: write.seo_title,
      meta_description: write.meta_description,
      excerpt: write.excerpt,
      body: write.body,
      published: true,
      published_at: existing.published_at ?? write.published_at,
      updated_at: now,
    };
    state.guides.set(guideId, guide);
  } else if (attachedGuideId) {
    throw new PublishConflictError(
      "guide_missing",
      "Opportunity points at a guide that no longer exists.",
    );
  } else {
    assertSlugAvailable(state, write.slug, null);
    guide = {
      id: guideId,
      title: write.title,
      slug: write.slug,
      seo_title: write.seo_title,
      meta_description: write.meta_description,
      excerpt: write.excerpt,
      body: write.body,
      published: true,
      published_at: write.published_at,
      created_at: now,
      updated_at: now,
    };
    state.guides.set(guideId, guide);
    created = true;
  }

  if (options.failAt === "guide_programs") {
    throw new Error("injected_failure_guide_programs");
  }

  state.guidePrograms.delete(guide.id);

  if (options.failAt === "guide_programs_insert") {
    throw new Error("injected_failure_guide_programs_insert");
  }

  state.guidePrograms.set(guide.id, [write.program_id]);

  if (options.failAt === "opportunity_attach") {
    throw new Error("injected_failure_opportunity_attach");
  }

  state.opportunityGuideIds.set(write.opportunity_id, guide.id);
  return { guide: toRecord(guide), created };
}

function assertSlugAvailable(
  state: InMemoryPublishState,
  slug: string,
  guideId: string | null,
): void {
  for (const other of state.guides.values()) {
    if (other.slug === slug && other.id !== guideId) {
      throw new PublishConflictError(
        "guide_slug_conflict",
        "A different guide already uses this slug.",
      );
    }
  }
}
