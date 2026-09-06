-- Milestone 2: program catalog schema for California Benefits Finder.
--
-- RLS decision:
--   Consumer reads (anon / authenticated) may SELECT programs that are
--   active and not EXPIRED, plus rules/locations/sources/relationships
--   that belong to those programs.
--   Anonymous and authenticated users cannot INSERT, UPDATE, or DELETE.
--   Admin writes will use the secret key from server-side code,
--   which bypasses RLS.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- programs
-- ---------------------------------------------------------------------------

CREATE TABLE public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  administrator TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  short_description TEXT,
  description TEXT,
  benefit_summary TEXT,
  benefit_type TEXT NOT NULL,
  benefit_min NUMERIC,
  benefit_max NUMERIC,
  benefit_period TEXT,
  status TEXT NOT NULL,
  official_url TEXT,
  application_url TEXT,
  statewide BOOLEAN NOT NULL DEFAULT FALSE,
  preapproval_required BOOLEAN,
  purchase_before_approval_allowed BOOLEAN,
  effective_start DATE,
  effective_end DATE,
  last_verified_at TIMESTAMPTZ,
  confidence TEXT,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT programs_status_check CHECK (
    status IN (
      'ACTIVE',
      'WAITLIST',
      'PAUSED',
      'FUNDING_EXHAUSTED',
      'UPCOMING',
      'EXPIRED',
      'UNCERTAIN'
    )
  ),
  CONSTRAINT programs_benefit_type_check CHECK (
    benefit_type IN (
      'CASH',
      'REBATE',
      'TAX_CREDIT',
      'BILL_SAVINGS',
      'FREE_SERVICE',
      'FREE_PRODUCT',
      'FORGIVABLE_LOAN',
      'LOAN',
      'FINANCING',
      'OTHER'
    )
  ),
  CONSTRAINT programs_confidence_check CHECK (
    confidence IS NULL OR confidence IN ('HIGH', 'MEDIUM', 'LOW')
  )
);

CREATE INDEX programs_category_idx ON public.programs (category);
CREATE INDEX programs_status_idx ON public.programs (status);
CREATE INDEX programs_active_idx ON public.programs (active);
-- programs.slug is already indexed by the UNIQUE constraint.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER programs_set_updated_at
BEFORE UPDATE ON public.programs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- program_rules
-- ---------------------------------------------------------------------------

CREATE TABLE public.program_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  operator TEXT NOT NULL,
  value JSONB,
  rule_group INTEGER NOT NULL DEFAULT 1,
  group_operator TEXT NOT NULL DEFAULT 'AND',
  required BOOLEAN NOT NULL DEFAULT TRUE,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT program_rules_operator_check CHECK (
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
      'not_exists'
    )
  ),
  CONSTRAINT program_rules_group_operator_check CHECK (
    group_operator IN ('AND', 'OR')
  )
);

CREATE INDEX program_rules_program_id_idx ON public.program_rules (program_id);

-- ---------------------------------------------------------------------------
-- program_locations
-- ---------------------------------------------------------------------------

CREATE TABLE public.program_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  location_type TEXT NOT NULL,
  location_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT program_locations_type_check CHECK (
    location_type IN (
      'STATE',
      'COUNTY',
      'CITY',
      'ZIP',
      'ELECTRIC_UTILITY',
      'GAS_UTILITY'
    )
  )
);

CREATE INDEX program_locations_program_id_idx
  ON public.program_locations (program_id);
CREATE INDEX program_locations_type_value_idx
  ON public.program_locations (location_type, location_value);

-- ---------------------------------------------------------------------------
-- program_sources
-- ---------------------------------------------------------------------------

CREATE TABLE public.program_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  organization TEXT,
  url TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT program_sources_type_check CHECK (
    source_type IN (
      'ELIGIBILITY',
      'BENEFIT',
      'STATUS',
      'APPLICATION',
      'GEOGRAPHY',
      'STACKING',
      'GENERAL'
    )
  )
);

CREATE INDEX program_sources_program_id_idx
  ON public.program_sources (program_id);

-- ---------------------------------------------------------------------------
-- program_relationships
-- ---------------------------------------------------------------------------

CREATE TABLE public.program_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_a_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  program_b_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT program_relationships_type_check CHECK (
    relationship_type IN (
      'STACKABLE',
      'CONDITIONALLY_STACKABLE',
      'MUTUALLY_EXCLUSIVE',
      'UNKNOWN',
      'REQUIRES_SEQUENCE'
    )
  ),
  CONSTRAINT program_relationships_no_self_check CHECK (program_a_id <> program_b_id),
  CONSTRAINT program_relationships_pair_type_unique
    UNIQUE (program_a_id, program_b_id, relationship_type)
);

-- Treat A→B and B→A as the same pair for a given relationship type.
CREATE UNIQUE INDEX program_relationships_undirected_pair_idx
  ON public.program_relationships (
    LEAST(program_a_id, program_b_id),
    GREATEST(program_a_id, program_b_id),
    relationship_type
  );

CREATE INDEX program_relationships_program_a_id_idx
  ON public.program_relationships (program_a_id);
CREATE INDEX program_relationships_program_b_id_idx
  ON public.program_relationships (program_b_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY programs_public_read
  ON public.programs
  FOR SELECT
  TO anon, authenticated
  USING (active = TRUE AND status <> 'EXPIRED');

CREATE POLICY program_rules_public_read
  ON public.program_rules
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.programs p
      WHERE p.id = program_rules.program_id
        AND p.active = TRUE
        AND p.status <> 'EXPIRED'
    )
  );

CREATE POLICY program_locations_public_read
  ON public.program_locations
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.programs p
      WHERE p.id = program_locations.program_id
        AND p.active = TRUE
        AND p.status <> 'EXPIRED'
    )
  );

CREATE POLICY program_sources_public_read
  ON public.program_sources
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.programs p
      WHERE p.id = program_sources.program_id
        AND p.active = TRUE
        AND p.status <> 'EXPIRED'
    )
  );

CREATE POLICY program_relationships_public_read
  ON public.program_relationships
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.programs a
      WHERE a.id = program_relationships.program_a_id
        AND a.active = TRUE
        AND a.status <> 'EXPIRED'
    )
    AND EXISTS (
      SELECT 1
      FROM public.programs b
      WHERE b.id = program_relationships.program_b_id
        AND b.active = TRUE
        AND b.status <> 'EXPIRED'
    )
  );

REVOKE ALL ON TABLE public.programs FROM anon, authenticated;
REVOKE ALL ON TABLE public.program_rules FROM anon, authenticated;
REVOKE ALL ON TABLE public.program_locations FROM anon, authenticated;
REVOKE ALL ON TABLE public.program_sources FROM anon, authenticated;
REVOKE ALL ON TABLE public.program_relationships FROM anon, authenticated;

GRANT SELECT ON TABLE public.programs TO anon, authenticated;
GRANT SELECT ON TABLE public.program_rules TO anon, authenticated;
GRANT SELECT ON TABLE public.program_locations TO anon, authenticated;
GRANT SELECT ON TABLE public.program_sources TO anon, authenticated;
GRANT SELECT ON TABLE public.program_relationships TO anon, authenticated;

GRANT ALL ON TABLE public.programs TO service_role;
GRANT ALL ON TABLE public.program_rules TO service_role;
GRANT ALL ON TABLE public.program_locations TO service_role;
GRANT ALL ON TABLE public.program_sources TO service_role;
GRANT ALL ON TABLE public.program_relationships TO service_role;
