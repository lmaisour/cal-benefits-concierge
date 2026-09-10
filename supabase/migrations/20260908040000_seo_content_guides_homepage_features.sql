-- SEO content platform: editorial program copy, FAQs, guides, and
-- homepage featured placements. Catalog import upserts program rows and
-- must not be the source of truth for these records.

-- ---------------------------------------------------------------------------
-- program_content (1:1 editorial fields; empty values stored as NULL)
-- ---------------------------------------------------------------------------

CREATE TABLE public.program_content (
  program_id UUID PRIMARY KEY REFERENCES public.programs(id) ON DELETE CASCADE,
  seo_title TEXT,
  meta_description TEXT,
  overview TEXT,
  benefit_explanation TEXT,
  how_to_apply TEXT,
  documents_needed TEXT,
  important_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER program_content_set_updated_at
BEFORE UPDATE ON public.program_content
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.program_content IS
  'Admin-managed SEO and guide copy for a program. Never overrides eligibility rules or status.';

-- ---------------------------------------------------------------------------
-- program_faqs
-- ---------------------------------------------------------------------------

CREATE TABLE public.program_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX program_faqs_program_id_sort_idx
  ON public.program_faqs (program_id, sort_order, created_at);

CREATE TRIGGER program_faqs_set_updated_at
BEFORE UPDATE ON public.program_faqs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.program_faqs IS
  'Admin-authored FAQs. Public pages and FAQ JSON-LD render only these stored questions.';

-- ---------------------------------------------------------------------------
-- guides
-- ---------------------------------------------------------------------------

CREATE TABLE public.guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  seo_title TEXT,
  meta_description TEXT,
  excerpt TEXT,
  body TEXT NOT NULL DEFAULT '',
  published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX guides_published_idx ON public.guides (published, published_at DESC);

CREATE TRIGGER guides_set_updated_at
BEFORE UPDATE ON public.guides
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- guide_programs (internal bidirectional links)
-- ---------------------------------------------------------------------------

CREATE TABLE public.guide_programs (
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (guide_id, program_id)
);

CREATE INDEX guide_programs_program_id_idx ON public.guide_programs (program_id);

-- ---------------------------------------------------------------------------
-- homepage_features (admin-managed homepage placements)
-- Distinct from programs.featured, which is catalog directory prominence.
-- ---------------------------------------------------------------------------

CREATE TABLE public.homepage_features (
  program_id UUID PRIMARY KEY REFERENCES public.programs(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX homepage_features_sort_idx
  ON public.homepage_features (sort_order, program_id);

CREATE TRIGGER homepage_features_set_updated_at
BEFORE UPDATE ON public.homepage_features
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.homepage_features IS
  'Programs marked for the consumer homepage. Public UI still reads name, status, and benefit facts from programs.';

-- Seed the initial homepage mix from verified ACTIVE catalog slugs.
-- Missing or non-ACTIVE rows are skipped so unavailable programs are never featured.
INSERT INTO public.homepage_features (program_id, sort_order)
SELECT p.id, seed.sort_order
FROM (
  VALUES
    ('myfirstev', 10),
    ('city-plants-free-trees', 20),
    ('la-metro-life', 30),
    ('ladwp-landscape-efficiency-assistance', 40),
    ('energy-savings-assistance', 50),
    ('dac-sash', 60)
) AS seed(slug, sort_order)
JOIN public.programs p ON p.slug = seed.slug
WHERE p.active = TRUE
  AND p.status = 'ACTIVE'
ON CONFLICT (program_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.program_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY program_content_public_read
  ON public.program_content
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.programs p
      WHERE p.id = program_content.program_id
        AND p.active = TRUE
        AND p.status <> 'EXPIRED'
    )
  );

CREATE POLICY program_faqs_public_read
  ON public.program_faqs
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.programs p
      WHERE p.id = program_faqs.program_id
        AND p.active = TRUE
        AND p.status <> 'EXPIRED'
    )
  );

CREATE POLICY guides_public_read
  ON public.guides
  FOR SELECT
  TO anon, authenticated
  USING (published = TRUE);

CREATE POLICY guide_programs_public_read
  ON public.guide_programs
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.guides g
      WHERE g.id = guide_programs.guide_id
        AND g.published = TRUE
    )
    AND EXISTS (
      SELECT 1
      FROM public.programs p
      WHERE p.id = guide_programs.program_id
        AND p.active = TRUE
        AND p.status <> 'EXPIRED'
    )
  );

CREATE POLICY homepage_features_public_read
  ON public.homepage_features
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.programs p
      WHERE p.id = homepage_features.program_id
        AND p.active = TRUE
        AND p.status <> 'EXPIRED'
    )
  );

REVOKE ALL ON TABLE public.program_content FROM anon, authenticated;
REVOKE ALL ON TABLE public.program_faqs FROM anon, authenticated;
REVOKE ALL ON TABLE public.guides FROM anon, authenticated;
REVOKE ALL ON TABLE public.guide_programs FROM anon, authenticated;
REVOKE ALL ON TABLE public.homepage_features FROM anon, authenticated;

GRANT SELECT ON TABLE public.program_content TO anon, authenticated;
GRANT SELECT ON TABLE public.program_faqs TO anon, authenticated;
GRANT SELECT ON TABLE public.guides TO anon, authenticated;
GRANT SELECT ON TABLE public.guide_programs TO anon, authenticated;
GRANT SELECT ON TABLE public.homepage_features TO anon, authenticated;

GRANT ALL ON TABLE public.program_content TO service_role;
GRANT ALL ON TABLE public.program_faqs TO service_role;
GRANT ALL ON TABLE public.guides TO service_role;
GRANT ALL ON TABLE public.guide_programs TO service_role;
GRANT ALL ON TABLE public.homepage_features TO service_role;
