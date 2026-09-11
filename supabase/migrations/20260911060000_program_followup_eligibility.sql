-- Program-specific supplemental eligibility questions and rules.
-- Follow-up answers are not stored here; consumers keep them in the session.

CREATE TABLE public.program_followup_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  question TEXT NOT NULL,
  help_text TEXT,
  answer_type TEXT NOT NULL DEFAULT 'single_choice',
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  display_when_field TEXT,
  display_when_operator TEXT,
  display_when_value JSONB,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  cta_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT program_followup_questions_program_key_unique
    UNIQUE (program_id, question_key),
  CONSTRAINT program_followup_questions_id_program_unique
    UNIQUE (id, program_id),
  CONSTRAINT program_followup_questions_key_format CHECK (
    question_key ~ '^[a-z][a-z0-9_]*$'
  ),
  CONSTRAINT program_followup_questions_answer_type_check CHECK (
    answer_type IN ('single_choice')
  ),
  CONSTRAINT program_followup_questions_display_pair_check CHECK (
    (
      display_when_field IS NULL
      AND display_when_operator IS NULL
      AND display_when_value IS NULL
    )
    OR (
      display_when_field IS NOT NULL
      AND display_when_operator IS NOT NULL
    )
  ),
  CONSTRAINT program_followup_questions_display_operator_check CHECK (
    display_when_operator IS NULL
    OR display_when_operator IN (
      'equals', 'not_equals',
      'greater_than', 'greater_than_or_equal',
      'less_than', 'less_than_or_equal',
      'in', 'not_in', 'contains',
      'is_true', 'is_false',
      'exists', 'not_exists'
    )
  )
);

CREATE TABLE public.program_followup_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,
  operator TEXT NOT NULL,
  expected_value JSONB,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT program_followup_rules_question_program_fk
    FOREIGN KEY (question_id, program_id)
    REFERENCES public.program_followup_questions (id, program_id)
    ON DELETE CASCADE,
  CONSTRAINT program_followup_rules_operator_check CHECK (
    operator IN (
      'equals', 'not_equals',
      'greater_than', 'greater_than_or_equal',
      'less_than', 'less_than_or_equal',
      'in', 'not_in', 'contains',
      'is_true', 'is_false',
      'exists', 'not_exists'
    )
  )
);

CREATE INDEX program_followup_questions_program_id_sort_idx
  ON public.program_followup_questions (program_id, sort_order);
CREATE INDEX program_followup_rules_program_id_idx
  ON public.program_followup_rules (program_id);
CREATE INDEX program_followup_rules_question_id_idx
  ON public.program_followup_rules (question_id);

ALTER TABLE public.program_followup_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_followup_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY program_followup_questions_public_read
  ON public.program_followup_questions
  FOR SELECT
  TO anon, authenticated
  USING (
    active = TRUE
    AND EXISTS (
      SELECT 1
      FROM public.programs p
      WHERE p.id = program_followup_questions.program_id
        AND p.active = TRUE
        AND p.status <> 'EXPIRED'
    )
  );

CREATE POLICY program_followup_rules_public_read
  ON public.program_followup_rules
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.programs p
      WHERE p.id = program_followup_rules.program_id
        AND p.active = TRUE
        AND p.status <> 'EXPIRED'
    )
  );

REVOKE ALL ON TABLE public.program_followup_questions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.program_followup_rules FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.program_followup_questions TO anon, authenticated;
GRANT SELECT ON TABLE public.program_followup_rules TO anon, authenticated;
GRANT ALL ON TABLE public.program_followup_questions TO service_role;
GRANT ALL ON TABLE public.program_followup_rules TO service_role;

-- Core property_type rule for LEAP (already collected in the questionnaire).
INSERT INTO public.program_rules (
  program_id,
  field,
  operator,
  value,
  rule_group,
  group_operator,
  required,
  explanation
)
SELECT
  p.id,
  'property_type',
  'equals',
  '"single_family"'::jsonb,
  1,
  'AND',
  TRUE,
  'LEAP is published for qualifying single-family homes.'
FROM public.programs p
WHERE p.external_id = 'LADWP-WATER-LEAP'
  AND NOT EXISTS (
    SELECT 1
    FROM public.program_rules r
    WHERE r.program_id = p.id
      AND r.field = 'property_type'
  );

UPDATE public.programs
SET
  unmodeled_required_criteria_summary =
    'You must live in a qualifying disadvantaged community. Address-based DAC eligibility is not confirmed here.',
  updated_at = NOW()
WHERE external_id = 'LADWP-WATER-LEAP';

-- LEAP pilot follow-up questions. Skip if already seeded.
INSERT INTO public.program_followup_questions (
  program_id,
  question_key,
  question,
  help_text,
  answer_type,
  options,
  sort_order,
  required,
  display_when_field,
  display_when_operator,
  display_when_value,
  active,
  cta_label
)
SELECT
  p.id,
  seed.question_key,
  seed.question,
  seed.help_text,
  'single_choice',
  seed.options,
  seed.sort_order,
  TRUE,
  seed.display_when_field,
  seed.display_when_operator,
  seed.display_when_value,
  TRUE,
  seed.cta_label
FROM public.programs p
CROSS JOIN (
  VALUES
    (
      'ladwp_water_service',
      'Does LADWP provide water service to this property?',
      'LEAP is for LADWP water customers. Choose Not sure if you do not know.',
      '[
        {"value":"yes","label":"Yes"},
        {"value":"no","label":"No"},
        {"value":"not_sure","label":"Not sure","unknown":true}
      ]'::jsonb,
      10,
      NULL::text,
      NULL::text,
      NULL::jsonb,
      'Check LEAP eligibility'
    ),
    (
      'front_yard_grass_size',
      'About how much living grass is currently in your front yard?',
      'Parkway grass may count toward the published range. Choose Not sure if you have not measured.',
      '[
        {"value":"under_500","label":"Less than 500 sq. ft."},
        {"value":"500_to_3000","label":"500–3,000 sq. ft."},
        {"value":"over_3000","label":"More than 3,000 sq. ft."},
        {"value":"not_sure","label":"Not sure","unknown":true}
      ]'::jsonb,
      20,
      NULL::text,
      NULL::text,
      NULL::jsonb,
      NULL::text
    ),
    (
      'property_owner_permission',
      'Can you get written permission from the property owner for the landscaping project?',
      'Required when you are not the owner of record.',
      '[
        {"value":"yes","label":"Yes"},
        {"value":"no","label":"No"},
        {"value":"not_sure","label":"Not sure","unknown":true}
      ]'::jsonb,
      30,
      'housing_status',
      'not_equals',
      '"owner"'::jsonb,
      NULL::text
    )
) AS seed(
  question_key,
  question,
  help_text,
  options,
  sort_order,
  display_when_field,
  display_when_operator,
  display_when_value,
  cta_label
)
WHERE p.external_id = 'LADWP-WATER-LEAP'
  AND NOT EXISTS (
    SELECT 1
    FROM public.program_followup_questions q
    WHERE q.program_id = p.id
      AND q.question_key = seed.question_key
  );

INSERT INTO public.program_followup_rules (
  program_id,
  question_id,
  operator,
  expected_value,
  required,
  explanation
)
SELECT
  q.program_id,
  q.id,
  'equals',
  seed.expected_value,
  TRUE,
  seed.explanation
FROM public.program_followup_questions q
JOIN public.programs p ON p.id = q.program_id
JOIN (
  VALUES
    (
      'ladwp_water_service',
      '"yes"'::jsonb,
      'LADWP must provide water service to the property.'
    ),
    (
      'front_yard_grass_size',
      '"500_to_3000"'::jsonb,
      'The front yard must have about 500 to 3,000 square feet of living grass.'
    ),
    (
      'property_owner_permission',
      '"yes"'::jsonb,
      'Written permission from the property owner is required when you do not own the home.'
    )
) AS seed(question_key, expected_value, explanation)
  ON seed.question_key = q.question_key
WHERE p.external_id = 'LADWP-WATER-LEAP'
  AND NOT EXISTS (
    SELECT 1
    FROM public.program_followup_rules r
    WHERE r.question_id = q.id
  );
