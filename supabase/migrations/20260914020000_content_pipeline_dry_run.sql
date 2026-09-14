-- Dry-run autonomous content pipeline (milestone 1).
-- Operational tables only. No public read or write. No PUBLISHED status.
-- Do not treat these rows as consumer-visible content.

-- ---------------------------------------------------------------------------
-- content_opportunities
-- ---------------------------------------------------------------------------

CREATE TABLE public.content_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_type TEXT NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  guide_id UUID REFERENCES public.guides(id) ON DELETE CASCADE,
  proposed_slug TEXT,
  proposed_title TEXT,
  primary_keyword TEXT,
  secondary_keywords TEXT[] NOT NULL DEFAULT '{}',
  score NUMERIC NOT NULL,
  score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  discovery_reason TEXT,
  status TEXT NOT NULL,
  next_eligible_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT content_opportunities_type_check CHECK (
    opportunity_type IN ('PROGRAM_GUIDE')
  ),
  CONSTRAINT content_opportunities_status_check CHECK (
    status IN (
      'DISCOVERED',
      'SELECTED',
      'RESEARCHING',
      'DRAFTED',
      'VALIDATION_FAILED',
      'READY_FOR_REVIEW',
      'SKIPPED',
      'ERROR'
    )
  ),
  CONSTRAINT content_opportunities_owner_check CHECK (
    (
      opportunity_type = 'PROGRAM_GUIDE'
      AND program_id IS NOT NULL
    )
  )
);

CREATE UNIQUE INDEX content_opportunities_type_program_uidx
  ON public.content_opportunities (opportunity_type, program_id)
  WHERE program_id IS NOT NULL;

CREATE INDEX content_opportunities_status_score_idx
  ON public.content_opportunities (status, score DESC);

CREATE INDEX content_opportunities_next_eligible_idx
  ON public.content_opportunities (next_eligible_at)
  WHERE next_eligible_at IS NOT NULL;

CREATE TRIGGER content_opportunities_set_updated_at
BEFORE UPDATE ON public.content_opportunities
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.content_opportunities IS
  'Internal content-pipeline opportunities. Admin/service-role only. Never queried by public pages.';

COMMENT ON COLUMN public.content_opportunities.status IS
  'Dry-run statuses only. PUBLISHED is intentionally omitted until a later publication milestone.';

-- ---------------------------------------------------------------------------
-- content_pipeline_runs
-- ---------------------------------------------------------------------------

CREATE TABLE public.content_pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES public.content_opportunities(id) ON DELETE SET NULL,
  mode TEXT NOT NULL DEFAULT 'DRY_RUN',
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  selected_reason TEXT,
  evidence_snapshot JSONB,
  draft_snapshot JSONB,
  validation_snapshot JSONB,
  error_message TEXT,
  provider_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT content_pipeline_runs_mode_check CHECK (
    mode IN ('DRY_RUN')
  ),
  CONSTRAINT content_pipeline_runs_status_check CHECK (
    status IN ('STARTED', 'COMPLETED', 'BLOCKED', 'ERROR')
  )
);

CREATE INDEX content_pipeline_runs_opportunity_id_idx
  ON public.content_pipeline_runs (opportunity_id, created_at DESC);

CREATE INDEX content_pipeline_runs_status_idx
  ON public.content_pipeline_runs (status, started_at DESC);

COMMENT ON TABLE public.content_pipeline_runs IS
  'Internal dry-run pipeline executions. Admin/service-role only. Snapshots are not published content.';

COMMENT ON COLUMN public.content_pipeline_runs.mode IS
  'Publication modes are not enabled. DRY_RUN is the only allowed value in this milestone.';

-- ---------------------------------------------------------------------------
-- Row Level Security: no public policies, no anon/authenticated grants
-- ---------------------------------------------------------------------------

ALTER TABLE public.content_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_pipeline_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.content_opportunities FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.content_pipeline_runs FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.content_opportunities TO service_role;
GRANT ALL ON TABLE public.content_pipeline_runs TO service_role;
