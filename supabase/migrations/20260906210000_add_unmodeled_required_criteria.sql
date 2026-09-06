-- Conservative matching: required eligibility that the current
-- UserProfile / rule engine cannot execute stays on the program row
-- instead of being invented as fake PASS/FAIL rules.

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS has_unmodeled_required_criteria BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS unmodeled_required_criteria_summary TEXT;

COMMENT ON COLUMN public.programs.has_unmodeled_required_criteria IS
  'True when one or more required eligibility conditions are not represented by executable rules or geography.';

COMMENT ON COLUMN public.programs.unmodeled_required_criteria_summary IS
  'Consumer-facing summary of required conditions the matcher cannot evaluate. Never used as a PASS/FAIL rule.';
