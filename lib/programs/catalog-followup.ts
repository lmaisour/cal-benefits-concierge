import { createHash } from "node:crypto";
import { CATALOG_FOLLOWUP_SEEDS } from "@/data/programs/followup-seeds";
import type { Json } from "@/types/database";
import type { Program, ProgramFollowupQuestion, ProgramFollowupRule } from "@/types/program";

const CATALOG_TIMESTAMP = "2026-09-11T00:00:00Z";

function catalogId(kind: "question" | "rule", programId: string, questionKey: string): string {
  const hex = createHash("sha1")
    .update(`followup:${kind}:${programId}:${questionKey}`)
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Materialize catalog follow-up seeds against live program UUIDs.
 * Used only when the follow-up tables are missing from the database.
 */
export function followupRowsFromCatalogSeeds(programs: Program[]): {
  questions: ProgramFollowupQuestion[];
  rules: ProgramFollowupRule[];
} {
  const byExternalId = new Map(
    programs
      .filter((program) => program.external_id)
      .map((program) => [program.external_id as string, program]),
  );

  const questions: ProgramFollowupQuestion[] = [];
  const rules: ProgramFollowupRule[] = [];

  for (const seed of CATALOG_FOLLOWUP_SEEDS) {
    const program = byExternalId.get(seed.externalId);
    if (!program) {
      continue;
    }
    for (const question of seed.questions) {
      const questionId = catalogId("question", program.id, question.questionKey);
      questions.push({
        id: questionId,
        program_id: program.id,
        question_key: question.questionKey,
        question: question.question,
        help_text: question.helpText,
        answer_type: "single_choice",
        options: question.options as Json,
        sort_order: question.sortOrder,
        required: question.required,
        display_when_field: question.displayWhenField,
        display_when_operator: question.displayWhenOperator,
        display_when_value: (question.displayWhenValue ?? null) as Json | null,
        active: true,
        cta_label: question.ctaLabel,
        created_at: CATALOG_TIMESTAMP,
        updated_at: CATALOG_TIMESTAMP,
      });
      rules.push({
        id: catalogId("rule", program.id, question.questionKey),
        program_id: program.id,
        question_id: questionId,
        operator: question.operator,
        expected_value: question.expectedValue as Json,
        required: question.ruleRequired,
        explanation: question.explanation,
        created_at: CATALOG_TIMESTAMP,
        updated_at: CATALOG_TIMESTAMP,
      });
    }
  }

  return { questions, rules };
}
