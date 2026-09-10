-- Internal SEO research briefs and editorial evidence.
-- These tables are admin-only working data. They are not published
-- consumer content and must never be readable by anon/authenticated.
--
-- Conceptual separation:
--   programs / program_rules / program_locations = eligibility truth
--   program_sources = canonical program sources
--   content_evidence = evidence behind editorial claims
--   content_briefs = SEO/search research
--   program_content / program_faqs / guides = published consumer content
--
-- seo_provider is a short identifier (default 'manual') so future
-- providers such as frase can be stored without a schema change.
-- Do not add provider-specific columns.

-- ---------------------------------------------------------------------------
-- content_briefs
-- ---------------------------------------------------------------------------

CREATE TABLE public.content_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  program_id UUID UNIQUE REFERENCES public.programs(id) ON DELETE CASCADE,
  guide_id UUID UNIQUE REFERENCES public.guides(id) ON DELETE CASCADE,
  primary_keyword TEXT,
  secondary_keywords TEXT[] NOT NULL DEFAULT '{}',
  search_intent TEXT,
  questions_to_answer TEXT[] NOT NULL DEFAULT '{}',
  topics_to_cover TEXT[] NOT NULL DEFAULT '{}',
  suggested_title TEXT,
  suggested_meta_description TEXT,
  competitor_notes TEXT,
  research_notes TEXT,
  seo_provider TEXT NOT NULL DEFAULT 'manual',
  provider_document_id TEXT,
  provider_score NUMERIC,
  researched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT content_briefs_type_check CHECK (
    content_type IN ('PROGRAM', 'GUIDE')
  ),
  CONSTRAINT content_briefs_owner_check CHECK (
    (
      content_type = 'PROGRAM'
      AND program_id IS NOT NULL
      AND guide_id IS NULL
    )
    OR (
      content_type = 'GUIDE'
      AND guide_id IS NOT NULL
      AND program_id IS NULL
    )
  ),
  CONSTRAINT content_briefs_seo_provider_check CHECK (
    seo_provider ~ '^[a-z][a-z0-9_-]{0,31}$'
  )
);

CREATE INDEX content_briefs_program_id_idx
  ON public.content_briefs (program_id)
  WHERE program_id IS NOT NULL;

CREATE INDEX content_briefs_guide_id_idx
  ON public.content_briefs (guide_id)
  WHERE guide_id IS NOT NULL;

CREATE TRIGGER content_briefs_set_updated_at
BEFORE UPDATE ON public.content_briefs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.content_briefs IS
  'Internal SEO/search research briefs. Admin-only. Never queried by public pages.';

COMMENT ON COLUMN public.content_briefs.seo_provider IS
  'Provider-agnostic short identifier. Default manual. Future values such as frase need no schema change.';

-- ---------------------------------------------------------------------------
-- content_evidence (program editorial claims only)
-- ---------------------------------------------------------------------------

CREATE TABLE public.content_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  content_section TEXT NOT NULL,
  claim TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_title TEXT,
  source_publisher TEXT,
  source_date DATE,
  verified_at TIMESTAMPTZ,
  confidence TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT content_evidence_confidence_check CHECK (
    confidence IN ('HIGH', 'MEDIUM', 'LOW')
  ),
  CONSTRAINT content_evidence_source_url_check CHECK (
    source_url LIKE 'http://%'
    OR source_url LIKE 'https://%'
  ),
  CONSTRAINT content_evidence_section_check CHECK (
    content_section !~ '^\s*$'
  ),
  CONSTRAINT content_evidence_claim_check CHECK (
    claim !~ '^\s*$'
  )
);

CREATE INDEX content_evidence_program_id_idx
  ON public.content_evidence (program_id, created_at);

CREATE TRIGGER content_evidence_set_updated_at
BEFORE UPDATE ON public.content_evidence
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.content_evidence IS
  'Internal evidence behind editorial claims. Does not replace program_sources, program_rules, or eligibility matching.';

-- ---------------------------------------------------------------------------
-- Row Level Security: no public policies, no anon/authenticated grants
-- ---------------------------------------------------------------------------

ALTER TABLE public.content_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_evidence ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.content_briefs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.content_evidence FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.content_briefs TO service_role;
GRANT ALL ON TABLE public.content_evidence TO service_role;
