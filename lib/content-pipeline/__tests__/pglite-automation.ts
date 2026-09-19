import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const MIGRATION_PATH = path.resolve(
  __dirname,
  "../../../supabase/migrations/20260919050000_content_automation_orchestrator.sql",
);

const PREREQUISITE_SQL = `
CREATE SCHEMA IF NOT EXISTS public;

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
