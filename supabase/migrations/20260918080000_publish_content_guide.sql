-- Atomic publication write for the content pipeline.
-- Application code remains the business/safety boundary: it loads the run,
-- verifies state/validation/identity, and maps the draft. This function only
-- persists the already-validated payload in one transaction.
--
-- Uniqueness constraints on guides.id, guides.slug, and guide_programs are
-- unchanged. Concurrent first-publish of the same opportunity is serialized
-- with FOR UPDATE on the opportunity row.

CREATE OR REPLACE FUNCTION public.publish_content_guide(
  p_guide_id uuid,
  p_opportunity_id uuid,
  p_program_id uuid,
  p_title text,
  p_slug text,
  p_seo_title text,
  p_meta_description text,
  p_excerpt text,
  p_body text,
  p_published_at timestamptz,
  p_fail_at text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opportunity public.content_opportunities%ROWTYPE;
  v_guide public.guides%ROWTYPE;
  v_guide_id uuid;
  v_created boolean := false;
  v_now timestamptz := clock_timestamp();
  v_constraint text;
BEGIN
  SELECT *
  INTO v_opportunity
  FROM public.content_opportunities
  WHERE id = p_opportunity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'opportunity_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_opportunity.guide_id IS NOT NULL AND v_opportunity.guide_id <> p_guide_id THEN
    RAISE EXCEPTION 'identity_mismatch' USING ERRCODE = 'P0003';
  END IF;

  v_guide_id := COALESCE(v_opportunity.guide_id, p_guide_id);

  SELECT *
  INTO v_guide
  FROM public.guides
  WHERE id = v_guide_id
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.guides
    SET
      title = p_title,
      slug = p_slug,
      seo_title = p_seo_title,
      meta_description = p_meta_description,
      excerpt = p_excerpt,
      body = p_body,
      published = TRUE,
      published_at = COALESCE(guides.published_at, p_published_at),
      updated_at = v_now
    WHERE id = v_guide_id
    RETURNING * INTO v_guide;
  ELSIF v_opportunity.guide_id IS NOT NULL THEN
    RAISE EXCEPTION 'guide_missing' USING ERRCODE = 'P0002';
  ELSE
    INSERT INTO public.guides (
      id,
      title,
      slug,
      seo_title,
      meta_description,
      excerpt,
      body,
      published,
      published_at,
      created_at,
      updated_at
    )
    VALUES (
      v_guide_id,
      p_title,
      p_slug,
      p_seo_title,
      p_meta_description,
      p_excerpt,
      p_body,
      TRUE,
      p_published_at,
      v_now,
      v_now
    )
    RETURNING * INTO v_guide;
    v_created := TRUE;
  END IF;

  IF p_fail_at = 'guide_programs' THEN
    RAISE EXCEPTION 'injected_failure_guide_programs' USING ERRCODE = 'P0004';
  END IF;

  DELETE FROM public.guide_programs
  WHERE guide_id = v_guide.id;

  IF p_fail_at = 'guide_programs_insert' THEN
    RAISE EXCEPTION 'injected_failure_guide_programs_insert' USING ERRCODE = 'P0004';
  END IF;

  INSERT INTO public.guide_programs (guide_id, program_id)
  VALUES (v_guide.id, p_program_id);

  IF p_fail_at = 'opportunity_attach' THEN
    RAISE EXCEPTION 'injected_failure_opportunity_attach' USING ERRCODE = 'P0004';
  END IF;

  UPDATE public.content_opportunities
  SET guide_id = v_guide.id
  WHERE id = p_opportunity_id;

  RETURN jsonb_build_object(
    'created', v_created,
    'guide', jsonb_build_object(
      'id', v_guide.id,
      'title', v_guide.title,
      'slug', v_guide.slug,
      'seo_title', v_guide.seo_title,
      'meta_description', v_guide.meta_description,
      'excerpt', v_guide.excerpt,
      'body', v_guide.body,
      'published', v_guide.published,
      'published_at', v_guide.published_at,
      'created_at', v_guide.created_at,
      'updated_at', v_guide.updated_at
    )
  );
EXCEPTION
  WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
    IF v_constraint = 'guides_slug_key' OR v_constraint ILIKE '%guides_slug%' THEN
      RAISE EXCEPTION 'guide_slug_conflict' USING ERRCODE = '23505';
    END IF;
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.publish_content_guide(
  uuid, uuid, uuid, text, text, text, text, text, text, timestamptz, text
) IS
  'Atomic content-pipeline publication write. Upserts the deterministic guide, preserves published_at on retry, replaces guide_programs, and attaches content_opportunities.guide_id in one transaction. p_fail_at is a test-only rollback injection point and must be omitted in production.';

REVOKE ALL ON FUNCTION public.publish_content_guide(
  uuid, uuid, uuid, text, text, text, text, text, text, timestamptz, text
) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.publish_content_guide(
      uuid, uuid, uuid, text, text, text, text, text, text, timestamptz, text
    ) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.publish_content_guide(
      uuid, uuid, uuid, text, text, text, text, text, text, timestamptz, text
    ) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.publish_content_guide(
      uuid, uuid, uuid, text, text, text, text, text, text, timestamptz, text
    ) TO service_role;
  END IF;
END
$$;
