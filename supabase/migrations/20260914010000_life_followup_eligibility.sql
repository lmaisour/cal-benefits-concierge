-- Generic: allow household-size income tables on core rules, and let a
-- follow-up satisfy a core rule group (OR pathway). Then seed LIFE only.

ALTER TABLE public.program_rules
  DROP CONSTRAINT IF EXISTS program_rules_operator_check;

ALTER TABLE public.program_rules
  ADD CONSTRAINT program_rules_operator_check CHECK (
    operator IN (
      'equals',
      'not_equals',
      'greater_than',
      'greater_than_or_equal',
      'less_than',
      'less_than_or_equal',
      'in',
      'not_in',
      'contains',
      'is_true',
      'is_false',
      'exists',
      'not_exists',
      'less_than_or_equal_by_household_size'
    )
  );

ALTER TABLE public.program_followup_rules
  ADD COLUMN IF NOT EXISTS satisfies_rule_group INTEGER;

COMMENT ON COLUMN public.program_followup_rules.satisfies_rule_group IS
  'When set, this required follow-up is an OR alternative for the matching core program_rules.rule_group. Null means the follow-up is an independent AND requirement.';

-- LIFE income table (household sizes 1–8 only; no invented increment above 8).
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
  'household_income',
  'less_than_or_equal_by_household_size',
  '{"1":58300,"2":66650,"3":74950,"4":83300,"5":89950,"6":96600,"7":103250,"8":110000}'::jsonb,
  1,
  'AND',
  TRUE,
  'Household income must be at or below the published LIFE limit for the household size, or the applicant must be enrolled in a qualifying public-benefit program.'
FROM public.programs p
WHERE p.external_id = 'LA-VEH-METRO-LIFE'
  AND NOT EXISTS (
    SELECT 1
    FROM public.program_rules r
    WHERE r.program_id = p.id
      AND r.field = 'household_income'
  );

UPDATE public.program_rules r
SET
  operator = 'less_than_or_equal_by_household_size',
  value = '{"1":58300,"2":66650,"3":74950,"4":83300,"5":89950,"6":96600,"7":103250,"8":110000}'::jsonb,
  rule_group = 1,
  group_operator = 'AND',
  required = TRUE,
  explanation =
    'Household income must be at or below the published LIFE limit for the household size, or the applicant must be enrolled in a qualifying public-benefit program.'
FROM public.programs p
WHERE p.id = r.program_id
  AND p.external_id = 'LA-VEH-METRO-LIFE'
  AND r.field = 'household_income';

UPDATE public.programs
SET
  has_unmodeled_required_criteria = FALSE,
  unmodeled_required_criteria_summary = NULL,
  updated_at = NOW()
WHERE external_id = 'LA-VEH-METRO-LIFE';

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
      'life_qualifying_public_benefit',
      'Are you currently enrolled in any of these programs?',
      'Some LIFE applicants can qualify through participation in another public-benefit program even if household income is above the listed LIFE limit. Examples include CalFresh / SNAP / EBT, Medi-Cal, reduced-price or free school lunch where Metro recognizes it, Social Security, Social Security Disability, and TANF.',
      '[
        {"value":"yes","label":"Yes"},
        {"value":"no","label":"No"},
        {"value":"not_sure","label":"I''m not sure","unknown":true}
      ]'::jsonb,
      10,
      NULL::text,
      NULL::text,
      NULL::jsonb,
      'Check LIFE eligibility'
    ),
    (
      'life_other_transit_subsidy',
      'Are you currently getting free or discounted transit through another transit program?',
      'Metro’s LIFE page lists GoPass, College U-Pass, and Employer Pass as conflicting examples. Another discount program is not treated as an automatic conflict here unless Metro names it.',
      '[
        {"value":"no","label":"No"},
        {"value":"gopass","label":"GoPass"},
        {"value":"college_upass","label":"College U-Pass"},
        {"value":"employer_pass","label":"Employer transit pass"},
        {"value":"other","label":"Another transit discount program","unknown":true},
        {"value":"not_sure","label":"I''m not sure","unknown":true}
      ]'::jsonb,
      20,
      NULL::text,
      NULL::text,
      NULL::jsonb,
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
WHERE p.external_id = 'LA-VEH-METRO-LIFE'
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
  explanation,
  satisfies_rule_group
)
SELECT
  q.program_id,
  q.id,
  'equals',
  seed.expected_value,
  TRUE,
  seed.explanation,
  seed.satisfies_rule_group
FROM public.program_followup_questions q
JOIN public.programs p ON p.id = q.program_id
JOIN (
  VALUES
    (
      'life_qualifying_public_benefit',
      '"yes"'::jsonb,
      'Enrollment in a qualifying public-benefit program can satisfy LIFE financial eligibility.',
      1::integer
    ),
    (
      'life_other_transit_subsidy',
      '"no"'::jsonb,
      'LIFE cannot be combined with GoPass, College U-Pass, or an employer transit pass.',
      NULL::integer
    )
) AS seed(question_key, expected_value, explanation, satisfies_rule_group)
  ON seed.question_key = q.question_key
WHERE p.external_id = 'LA-VEH-METRO-LIFE'
  AND NOT EXISTS (
    SELECT 1
    FROM public.program_followup_rules r
    WHERE r.question_id = q.id
  );

UPDATE public.program_followup_rules r
SET
  satisfies_rule_group = 1,
  expected_value = '"yes"'::jsonb,
  explanation =
    'Enrollment in a qualifying public-benefit program can satisfy LIFE financial eligibility.'
FROM public.program_followup_questions q
JOIN public.programs p ON p.id = q.program_id
WHERE r.question_id = q.id
  AND p.external_id = 'LA-VEH-METRO-LIFE'
  AND q.question_key = 'life_qualifying_public_benefit';

UPDATE public.program_followup_rules r
SET
  satisfies_rule_group = NULL,
  expected_value = '"no"'::jsonb,
  explanation =
    'LIFE cannot be combined with GoPass, College U-Pass, or an employer transit pass.'
FROM public.program_followup_questions q
JOIN public.programs p ON p.id = q.program_id
WHERE r.question_id = q.id
  AND p.external_id = 'LA-VEH-METRO-LIFE'
  AND q.question_key = 'life_other_transit_subsidy';
