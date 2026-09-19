import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION = path.resolve(
  __dirname,
  "../../../supabase/migrations/20260914020000_content_pipeline_dry_run.sql",
);
const TIER_MIGRATION = path.resolve(
  __dirname,
  "../../../supabase/migrations/20260914030000_content_pipeline_benefit_tiers.sql",
);

describe("content pipeline migration", () => {
  const sql = readFileSync(MIGRATION, "utf8");

  it("creates operational tables without a PUBLISHED status", () => {
    expect(sql).toContain("CREATE TABLE public.content_opportunities");
    expect(sql).toContain("CREATE TABLE public.content_pipeline_runs");
    expect(sql).toContain("DISCOVERED");
    expect(sql).toContain("READY_FOR_REVIEW");
    expect(sql).toContain("VALIDATION_FAILED");
    expect(sql).toMatch(/status IN \(\s*'DISCOVERED'/);
    expect(sql).not.toMatch(/status IN \([^)]*'PUBLISHED'/);
    expect(sql).toContain("mode IN ('DRY_RUN')");
  });

  it("blocks public read and write access", () => {
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain(
      "REVOKE ALL ON TABLE public.content_opportunities FROM PUBLIC, anon, authenticated",
    );
    expect(sql).toContain(
      "REVOKE ALL ON TABLE public.content_pipeline_runs FROM PUBLIC, anon, authenticated",
    );
    expect(sql).toContain("GRANT ALL ON TABLE public.content_opportunities TO service_role");
    expect(sql).toContain("GRANT ALL ON TABLE public.content_pipeline_runs TO service_role");
    expect(sql).not.toMatch(/CREATE POLICY/);
  });

  it("keeps one opportunity per program type", () => {
    expect(sql).toContain("CREATE UNIQUE INDEX content_opportunities_type_program_uidx");
  });
});

const AUTOMATION_MIGRATION = path.resolve(
  __dirname,
  "../../../supabase/migrations/20260919050000_content_automation_orchestrator.sql",
);

describe("content automation orchestrator migration", () => {
  const sql = readFileSync(AUTOMATION_MIGRATION, "utf8");

  it("adds scheduler, lock, execution, and fingerprint storage", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS authoritative_state_fingerprint TEXT");
    expect(sql).toContain("CREATE TABLE public.content_automation_schedule");
    expect(sql).toContain("CREATE TABLE public.content_automation_locks");
    expect(sql).toContain("CREATE TABLE public.content_automation_executions");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.acquire_content_automation_lock");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.renew_content_automation_lock");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.owns_content_automation_lock");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.release_content_automation_lock");
    expect(sql).toContain("WHERE public.content_automation_locks.expires_at <= v_now");
    expect(sql).not.toMatch(
      /expires_at <= v_now\s+OR public\.content_automation_locks\.owner_id = EXCLUDED\.owner_id/,
    );
    expect(sql).toContain("last_successful_publish_at");
    expect(sql).toContain("next_publish_at");
    expect(sql).toContain("COMPLETED_DRY_RUN");
    expect(sql).not.toContain("publishGuide");
  });

  it("locks SECURITY DEFINER RPCs to service_role", () => {
    expect(sql).toContain("SET search_path = public");
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.acquire_content_automation_lock(text, uuid, integer) FROM PUBLIC",
    );
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.release_content_automation_lock(text, uuid) FROM PUBLIC",
    );
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.renew_content_automation_lock(text, uuid, integer) FROM PUBLIC",
    );
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.acquire_content_automation_lock(text, uuid, integer) TO service_role",
    );
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.renew_content_automation_lock(text, uuid, integer) TO service_role",
    );
    expect(sql).toContain(
      "REVOKE ALL ON TABLE public.content_automation_schedule FROM PUBLIC, anon, authenticated",
    );
    expect(sql).toContain(
      "REVOKE ALL ON TABLE public.content_automation_executions FROM PUBLIC, anon, authenticated",
    );
  });
});

describe("content pipeline benefit-tier migration", () => {
  const sql = readFileSync(TIER_MIGRATION, "utf8");

  it("adds an explicit amount-structure column without inferring RANGE or TIERED", () => {
    expect(sql).toContain("ADD COLUMN benefit_amount_structure TEXT");
    expect(sql).toContain("'SINGLE', 'RANGE', 'TIERED', 'UNKNOWN'");
    expect(sql).toMatch(/NULL means infer safely/);
  });

  it("creates modeled tier rows and does not seed live program facts", () => {
    expect(sql).toContain("CREATE TABLE public.program_benefit_tiers");
    expect(sql).not.toMatch(/CA-VEH-BAR-RETIRE|1350|2000/);
    expect(sql).toContain("GRANT SELECT ON TABLE public.program_benefit_tiers TO anon, authenticated");
  });
});
