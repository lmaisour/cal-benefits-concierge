import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type { PublishFailAt, PublishGuideWrite } from "@/lib/content-pipeline/publish-store";

const MIGRATION_PATH = path.resolve(
  __dirname,
  "../../../supabase/migrations/20260918080000_publish_content_guide.sql",
);

const SCHEMA_SQL = `
CREATE TABLE public.programs (
  id UUID PRIMARY KEY
);

CREATE TABLE public.guides (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  seo_title TEXT,
  meta_description TEXT,
  excerpt TEXT,
  body TEXT NOT NULL DEFAULT '',
  published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.guide_programs (
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (guide_id, program_id)
);

CREATE TABLE public.content_opportunities (
  id UUID PRIMARY KEY,
  opportunity_type TEXT NOT NULL,
  program_id UUID REFERENCES public.programs(id),
  guide_id UUID REFERENCES public.guides(id) ON DELETE CASCADE,
  proposed_slug TEXT,
  proposed_title TEXT,
  primary_keyword TEXT,
  secondary_keywords TEXT[] NOT NULL DEFAULT '{}',
  score NUMERIC NOT NULL DEFAULT 0,
  score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  discovery_reason TEXT,
  status TEXT NOT NULL DEFAULT 'READY_FOR_REVIEW',
  next_eligible_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

export type PublishSnapshot = {
  guides: Array<Record<string, unknown>>;
  guidePrograms: Array<Record<string, unknown>>;
  opportunityGuideId: string | null;
};

export type PublishCallResult =
  | { ok: true; created: boolean; publishedAt: string | null; guideId: string }
  | { ok: false; message: string };

function asIso(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

export async function createPostgresPublishHarness() {
  const db = new PGlite();
  await db.exec(SCHEMA_SQL);
  await db.exec(readFileSync(MIGRATION_PATH, "utf8"));

  async function reset() {
    await db.exec(
      "TRUNCATE public.guide_programs, public.content_opportunities, public.guides, public.programs CASCADE",
    );
  }

  async function seed(write: PublishGuideWrite, extra?: { collidingGuideId?: string }) {
    await reset();
    await db.query("INSERT INTO public.programs (id) VALUES ($1)", [write.program_id]);
    await db.query(
      `INSERT INTO public.content_opportunities (
        id, opportunity_type, program_id, proposed_slug, score, status
      ) VALUES ($1, 'PROGRAM_GUIDE', $2, $3, 80, 'READY_FOR_REVIEW')`,
      [write.opportunity_id, write.program_id, write.slug],
    );
    if (extra?.collidingGuideId) {
      await db.query(
        `INSERT INTO public.guides (
          id, title, slug, seo_title, meta_description, excerpt, body, published, published_at
        ) VALUES ($1, 'Other', $2, 'Other', 'Other', 'Other', 'Other', TRUE, $3)`,
        [extra.collidingGuideId, write.slug, write.published_at],
      );
    }
  }

  async function seedPublished(write: PublishGuideWrite) {
    await seed(write);
    const first = await publish(write);
    if (!first.ok) {
      throw new Error(`Failed to seed published guide: ${first.message}`);
    }
    return first;
  }

  async function publish(
    write: PublishGuideWrite,
    failAt: PublishFailAt | null = null,
  ): Promise<PublishCallResult> {
    try {
      const result = await db.query<{ result: unknown }>(
        `SELECT public.publish_content_guide(
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        ) AS result`,
        [
          write.id,
          write.opportunity_id,
          write.program_id,
          write.title,
          write.slug,
          write.seo_title,
          write.meta_description,
          write.excerpt,
          write.body,
          write.published_at,
          failAt,
        ],
      );
      const payload = result.rows[0]?.result as {
        created?: boolean;
        guide?: { id?: string; published_at?: unknown };
      };
      return {
        ok: true,
        created: Boolean(payload?.created),
        publishedAt: asIso(payload?.guide?.published_at),
        guideId: String(payload?.guide?.id ?? ""),
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "publish failed",
      };
    }
  }

  async function snapshot(opportunityId: string): Promise<PublishSnapshot> {
    const guides = await db.query("SELECT id, slug, published, published_at, body FROM public.guides");
    const guidePrograms = await db.query(
      "SELECT guide_id, program_id FROM public.guide_programs",
    );
    const opportunity = await db.query<{ guide_id: string | null }>(
      "SELECT guide_id FROM public.content_opportunities WHERE id = $1",
      [opportunityId],
    );
    return {
      guides: guides.rows as Array<Record<string, unknown>>,
      guidePrograms: guidePrograms.rows as Array<Record<string, unknown>>,
      opportunityGuideId: opportunity.rows[0]?.guide_id ?? null,
    };
  }

  async function constraintNames() {
    const result = await db.query<{ conname: string; contype: string }>(
      `SELECT conname, contype
       FROM pg_constraint
       WHERE conrelid IN ('public.guides'::regclass, 'public.guide_programs'::regclass)
       ORDER BY conname`,
    );
    return result.rows;
  }

  async function functionSource() {
    const result = await db.query<{ source: string }>(
      `SELECT pg_get_functiondef('public.publish_content_guide(uuid, uuid, uuid, text, text, text, text, text, text, timestamptz, text)'::regprocedure) AS source`,
    );
    return result.rows[0]?.source ?? "";
  }

  return { db, seed, seedPublished, publish, snapshot, constraintNames, functionSource, reset };
}
