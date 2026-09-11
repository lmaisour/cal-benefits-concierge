import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ORIGINAL = path.resolve(
  __dirname,
  "../../../supabase/migrations/20260911060000_program_followup_eligibility.sql",
);
const SCOPE = path.resolve(
  __dirname,
  "../../../supabase/migrations/20260911150000_followup_rule_question_same_program.sql",
);

describe("follow-up rule question belongs to the same program", () => {
  const originalSql = readFileSync(ORIGINAL, "utf8");
  const scopeSql = readFileSync(SCOPE, "utf8");

  it("creates a unique (id, program_id) target for the composite FK", () => {
    expect(originalSql).toContain("CONSTRAINT program_followup_questions_id_program_unique");
    expect(originalSql).toContain("UNIQUE (id, program_id)");
    expect(scopeSql).toContain("program_followup_questions_id_program_unique");
    expect(scopeSql).toContain("UNIQUE (id, program_id)");
  });

  it("references questions by (question_id, program_id), not question_id alone", () => {
    expect(originalSql).toContain("CONSTRAINT program_followup_rules_question_program_fk");
    expect(originalSql).toContain("FOREIGN KEY (question_id, program_id)");
    expect(originalSql).toContain(
      "REFERENCES public.program_followup_questions (id, program_id)",
    );
    expect(originalSql).not.toMatch(
      /question_id UUID NOT NULL REFERENCES public\.program_followup_questions\(id\)/,
    );

    expect(scopeSql).toContain("program_followup_rules_question_program_fk");
    expect(scopeSql).toContain("FOREIGN KEY (question_id, program_id)");
    expect(scopeSql).toContain(
      "REFERENCES public.program_followup_questions (id, program_id)",
    );
    expect(scopeSql).toContain("DROP CONSTRAINT program_followup_rules_question_id_fkey");
  });
});
