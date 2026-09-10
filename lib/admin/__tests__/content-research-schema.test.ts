import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SEO_PROVIDER_PATTERN } from "@/lib/admin/validate-content-brief";

const MIGRATION = path.resolve(
  __dirname,
  "../../../supabase/migrations/20260910060000_content_briefs_and_evidence.sql",
);

const SQL_PROVIDER_PATTERN = "^[a-z][a-z0-9_-]{0,31}$";

describe("content research migration CHECK constraints", () => {
  const sql = readFileSync(MIGRATION, "utf8");

  it("matches SEO_PROVIDER_PATTERN without enumerating providers", () => {
    expect(SEO_PROVIDER_PATTERN.source).toBe(SQL_PROVIDER_PATTERN);
    expect(sql).toContain("CONSTRAINT content_briefs_seo_provider_check CHECK (");
    expect(sql).toContain(`seo_provider ~ '${SQL_PROVIDER_PATTERN}'`);
    expect(sql).not.toMatch(/seo_provider\s+IN\s*\(/);
  });

  it("requires source_url to begin with http:// or https://", () => {
    expect(sql).toContain("CONSTRAINT content_evidence_source_url_check CHECK (");
    expect(sql).toContain("source_url LIKE 'http://%'");
    expect(sql).toContain("source_url LIKE 'https://%'");
  });

  it("rejects empty or whitespace-only content_section and claim", () => {
    expect(sql).toContain("CONSTRAINT content_evidence_section_check CHECK (");
    expect(sql).toContain("content_section !~ '^\\s*$'");
    expect(sql).toContain("CONSTRAINT content_evidence_claim_check CHECK (");
    expect(sql).toContain("claim !~ '^\\s*$'");
  });
});
