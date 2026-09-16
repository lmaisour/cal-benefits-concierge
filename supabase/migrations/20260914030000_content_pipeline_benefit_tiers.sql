-- Structured benefit amount presentation for the content pipeline.
-- Do not infer RANGE or TIERED from prose. NULL means the application
-- infers SINGLE when min equals max (or only one amount exists), else UNKNOWN.
-- This file is not applied live by this milestone.

-- ---------------------------------------------------------------------------
-- programs.benefit_amount_structure
-- ---------------------------------------------------------------------------

ALTER TABLE public.programs
  ADD COLUMN benefit_amount_structure TEXT;

ALTER TABLE public.programs
  ADD CONSTRAINT programs_benefit_amount_structure_check
  CHECK (
    benefit_amount_structure IS NULL
    OR benefit_amount_structure IN ('SINGLE', 'RANGE', 'TIERED', 'UNKNOWN')
  );

COMMENT ON COLUMN public.programs.benefit_amount_structure IS
  'Explicit amount presentation: SINGLE, RANGE, TIERED, or UNKNOWN. NULL means infer safely (never infer RANGE or TIERED).';

-- ---------------------------------------------------------------------------
-- program_benefit_tiers
-- ---------------------------------------------------------------------------

CREATE TABLE public.program_benefit_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  amount NUMERIC,
  label TEXT NOT NULL,
  condition_summary TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT program_benefit_tiers_label_check CHECK (char_length(btrim(label)) > 0),
  CONSTRAINT program_benefit_tiers_condition_check CHECK (char_length(btrim(condition_summary)) > 0)
);

CREATE INDEX program_benefit_tiers_program_id_idx
  ON public.program_benefit_tiers (program_id, sort_order);

CREATE TRIGGER program_benefit_tiers_set_updated_at
BEFORE UPDATE ON public.program_benefit_tiers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.program_benefit_tiers IS
  'Modeled discrete award tiers. Required before a benefit may be presented as TIERED.';

-- ---------------------------------------------------------------------------
-- Row Level Security: same public-read pattern as program_rules
-- ---------------------------------------------------------------------------

ALTER TABLE public.program_benefit_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY program_benefit_tiers_public_read
  ON public.program_benefit_tiers
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.programs p
      WHERE p.id = program_benefit_tiers.program_id
        AND p.active = TRUE
        AND p.status <> 'EXPIRED'
    )
  );

REVOKE ALL ON TABLE public.program_benefit_tiers FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.program_benefit_tiers TO anon, authenticated;
GRANT ALL ON TABLE public.program_benefit_tiers TO service_role;
