-- A follow-up rule must reference a question on the same program.
-- Composite FK on (question_id, program_id). Idempotent for databases that
-- already applied the original follow-up tables, and for fresh installs that
-- already include this constraint.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'program_followup_questions_id_program_unique'
  ) THEN
    ALTER TABLE public.program_followup_questions
      ADD CONSTRAINT program_followup_questions_id_program_unique
      UNIQUE (id, program_id);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'program_followup_rules_question_id_fkey'
  ) THEN
    ALTER TABLE public.program_followup_rules
      DROP CONSTRAINT program_followup_rules_question_id_fkey;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'program_followup_rules_question_program_fk'
  ) THEN
    ALTER TABLE public.program_followup_rules
      ADD CONSTRAINT program_followup_rules_question_program_fk
      FOREIGN KEY (question_id, program_id)
      REFERENCES public.program_followup_questions (id, program_id)
      ON DELETE CASCADE;
  END IF;
END $$;
