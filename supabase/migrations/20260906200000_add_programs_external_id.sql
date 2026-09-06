-- Milestone 7A: stable research/import identifier for programs.
-- The UUID remains the internal primary key. external_id is the
-- canonical research ID (for example CA-VEH-MYFIRSTEV).

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS programs_external_id_uidx
  ON public.programs (external_id)
  WHERE external_id IS NOT NULL;

COMMENT ON COLUMN public.programs.external_id IS
  'Stable research/import identifier. Not the internal UUID.';
