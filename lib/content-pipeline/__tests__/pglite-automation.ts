import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const MIGRATION_PATH = path.resolve(
  __dirname,
  "../../../supabase/migrations/20260919050000_content_automation_orchestrator.sql",
);

const PREREQUISITE_SQL = `
CREATE SCHEMA IF NOT EXISTS public;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE public.content_pipeline_runs (
  id UUID PRIMARY KEY
);
`;

export async function createAutomationLockHarness() {
  const db = new PGlite();
  await db.exec(PREREQUISITE_SQL);
  await db.exec(readFileSync(MIGRATION_PATH, "utf8"));
  return db;
}

const PUBLISH_MIGRATION_PATH = path.resolve(
  __dirname,
  "../../../supabase/migrations/20260918080000_publish_content_guide.sql",
);
const AUTOMATION_PUBLISH_MIGRATION_PATH = path.resolve(
  __dirname,
  "../../../supabase/migrations/20260919180000_content_automation_publish.sql",
);

const PUBLISH_SCHEMA_SQL = `
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

export async function createAutonomousPublishSqlHarness() {
  const db = new PGlite();
  await db.exec(PREREQUISITE_SQL);
  await db.exec(PUBLISH_SCHEMA_SQL);
  await db.exec(readFileSync(PUBLISH_MIGRATION_PATH, "utf8"));
  await db.exec(readFileSync(MIGRATION_PATH, "utf8"));
  await db.exec(readFileSync(AUTOMATION_PUBLISH_MIGRATION_PATH, "utf8"));
  return db;
}
