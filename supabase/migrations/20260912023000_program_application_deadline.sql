-- Distinct application deadline vs program effective period.
-- application_deadline does not expire a program by itself.

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS application_deadline DATE;

COMMENT ON COLUMN public.programs.application_deadline IS
  'Last calendar date applications are accepted. Distinct from effective_end (program period). Does not expire the program by itself.';

-- LEAP Oct 31, 2026 is an application deadline, not a program-period end.
UPDATE public.programs
SET
  application_deadline = '2026-10-31',
  effective_end = NULL,
  updated_at = NOW()
WHERE external_id = 'LADWP-WATER-LEAP'
  AND (
    application_deadline IS DISTINCT FROM DATE '2026-10-31'
    OR effective_end IS DISTINCT FROM NULL
  );
