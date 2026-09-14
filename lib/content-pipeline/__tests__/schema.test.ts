import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION = path.resolve(
  __dirname,
  "../../../supabase/migrations/20260914020000_content_pipeline_dry_run.sql",
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
