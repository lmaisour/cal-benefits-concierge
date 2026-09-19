-- Autonomous content orchestrator (safe / dry-run phase).
-- Scheduler state, atomic execution lease, execution records, and
-- authoritative-state fingerprints. This migration does not publish
-- anything and does not enable automation.

-- ---------------------------------------------------------------------------
-- Fingerprint on pipeline runs (null = historical, not auto-publishable)
-- ---------------------------------------------------------------------------

ALTER TABLE public.content_pipeline_runs
  ADD COLUMN IF NOT EXISTS authoritative_state_fingerprint TEXT;

COMMENT ON COLUMN public.content_pipeline_runs.authoritative_state_fingerprint IS
  'SHA-256 of the authoritative factual inputs used to generate this run. NULL means the run is not eligible for autonomous publication.';

-- ---------------------------------------------------------------------------
-- content_automation_schedule (singleton cadence)
-- ---------------------------------------------------------------------------

CREATE TABLE public.content_automation_schedule (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  last_successful_publish_at TIMESTAMPTZ,
  next_publish_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.content_automation_schedule (id, last_successful_publish_at, next_publish_at)
VALUES ('default', NULL, NOW());

COMMENT ON TABLE public.content_automation_schedule IS
  'Singleton publication cadence. last_successful_publish_at advances only after a successful publish, never after a dry-run or failed generation.';

-- ---------------------------------------------------------------------------
-- content_automation_locks (atomic lease)
-- ---------------------------------------------------------------------------

CREATE TABLE public.content_automation_locks (
  lock_key TEXT PRIMARY KEY,
  owner_id UUID NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

COMMENT ON TABLE public.content_automation_locks IS
  'Database-backed exclusive lease for one content-automation cycle. Expired rows may be reclaimed; active rows cannot.';

CREATE OR REPLACE FUNCTION public.acquire_content_automation_lock(
  p_lock_key text,
  p_owner_id uuid,
  p_lease_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_expires timestamptz;
  v_row public.content_automation_locks%ROWTYPE;
BEGIN
  IF p_lock_key IS NULL OR length(btrim(p_lock_key)) = 0 THEN
    RAISE EXCEPTION 'invalid_lock_key' USING ERRCODE = 'P0001';
  END IF;
  IF p_owner_id IS NULL THEN
    RAISE EXCEPTION 'invalid_lock_owner' USING ERRCODE = 'P0001';
  END IF;
  IF p_lease_seconds IS NULL OR p_lease_seconds < 1 OR p_lease_seconds > 3600 THEN
    RAISE EXCEPTION 'invalid_lock_lease' USING ERRCODE = 'P0001';
  END IF;

  v_expires := v_now + make_interval(secs => p_lease_seconds);

  INSERT INTO public.content_automation_locks (lock_key, owner_id, acquired_at, expires_at)
  VALUES (btrim(p_lock_key), p_owner_id, v_now, v_expires)
  ON CONFLICT (lock_key) DO UPDATE
    SET owner_id = EXCLUDED.owner_id,
        acquired_at = EXCLUDED.acquired_at,
        expires_at = EXCLUDED.expires_at
    WHERE public.content_automation_locks.expires_at <= v_now
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('acquired', false);
  END IF;

  RETURN jsonb_build_object(
    'acquired', true,
    'owner_id', v_row.owner_id,
    'expires_at', v_row.expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.renew_content_automation_lock(
  p_lock_key text,
  p_owner_id uuid,
  p_lease_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_expires timestamptz;
  v_row public.content_automation_locks%ROWTYPE;
BEGIN
  IF p_lock_key IS NULL OR length(btrim(p_lock_key)) = 0 THEN
    RAISE EXCEPTION 'invalid_lock_key' USING ERRCODE = 'P0001';
  END IF;
  IF p_owner_id IS NULL THEN
    RAISE EXCEPTION 'invalid_lock_owner' USING ERRCODE = 'P0001';
  END IF;
  IF p_lease_seconds IS NULL OR p_lease_seconds < 1 OR p_lease_seconds > 3600 THEN
    RAISE EXCEPTION 'invalid_lock_lease' USING ERRCODE = 'P0001';
  END IF;

  v_expires := v_now + make_interval(secs => p_lease_seconds);

  UPDATE public.content_automation_locks
  SET expires_at = v_expires
  WHERE lock_key = btrim(p_lock_key)
    AND owner_id = p_owner_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('renewed', false);
  END IF;

  RETURN jsonb_build_object(
    'renewed', true,
    'owner_id', v_row.owner_id,
    'expires_at', v_row.expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.owns_content_automation_lock(
  p_lock_key text,
  p_owner_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_lock_key IS NULL OR p_owner_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.content_automation_locks
    WHERE lock_key = btrim(p_lock_key)
      AND owner_id = p_owner_id
      AND expires_at > clock_timestamp()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_content_automation_lock(
  p_lock_key text,
  p_owner_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  IF p_lock_key IS NULL OR p_owner_id IS NULL THEN
    RETURN false;
  END IF;

  DELETE FROM public.content_automation_locks
  WHERE lock_key = btrim(p_lock_key)
    AND owner_id = p_owner_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

-- ---------------------------------------------------------------------------
-- content_automation_executions
-- ---------------------------------------------------------------------------

CREATE TABLE public.content_automation_executions (
  id UUID PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  trigger TEXT NOT NULL,
  due BOOLEAN,
  lock_owner UUID,
  pipeline_run_id UUID REFERENCES public.content_pipeline_runs(id) ON DELETE SET NULL,
  opportunity_id UUID,
  program_id UUID,
  provider TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  drafts_generated INTEGER NOT NULL DEFAULT 0,
  validation_passed BOOLEAN,
  authoritative_state_fingerprint TEXT,
  publish_attempted BOOLEAN NOT NULL DEFAULT FALSE,
  publish_succeeded BOOLEAN NOT NULL DEFAULT FALSE,
  guide_id UUID,
  error_code TEXT,
  error_message TEXT,
  provider_usage JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT content_automation_executions_status_check CHECK (
    status IN (
      'STARTED',
      'NOT_DUE',
      'LOCKED',
      'GENERATED',
      'BLOCKED',
      'ERROR',
      'COMPLETED_DRY_RUN'
    )
  ),
  CONSTRAINT content_automation_executions_trigger_check CHECK (
    trigger IN ('MANUAL', 'CRON')
  )
);

CREATE INDEX content_automation_executions_started_idx
  ON public.content_automation_executions (started_at DESC);

CREATE TRIGGER content_automation_executions_set_updated_at
BEFORE UPDATE ON public.content_automation_executions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.content_automation_executions IS
  'Durable autonomous-cycle records. Admin/service-role only. Never stores secrets. This milestone never sets publish_attempted.';

-- ---------------------------------------------------------------------------
-- RLS / grants: operational tables, no public access
-- ---------------------------------------------------------------------------

ALTER TABLE public.content_automation_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_automation_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_automation_executions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.content_automation_schedule FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.content_automation_locks FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.content_automation_executions FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.content_automation_schedule TO service_role;
GRANT ALL ON TABLE public.content_automation_locks TO service_role;
GRANT ALL ON TABLE public.content_automation_executions TO service_role;

REVOKE ALL ON FUNCTION public.acquire_content_automation_lock(text, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.renew_content_automation_lock(text, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owns_content_automation_lock(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_content_automation_lock(text, uuid) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.acquire_content_automation_lock(text, uuid, integer) FROM anon;
    REVOKE ALL ON FUNCTION public.renew_content_automation_lock(text, uuid, integer) FROM anon;
    REVOKE ALL ON FUNCTION public.owns_content_automation_lock(text, uuid) FROM anon;
    REVOKE ALL ON FUNCTION public.release_content_automation_lock(text, uuid) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.acquire_content_automation_lock(text, uuid, integer) FROM authenticated;
    REVOKE ALL ON FUNCTION public.renew_content_automation_lock(text, uuid, integer) FROM authenticated;
    REVOKE ALL ON FUNCTION public.owns_content_automation_lock(text, uuid) FROM authenticated;
    REVOKE ALL ON FUNCTION public.release_content_automation_lock(text, uuid) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.acquire_content_automation_lock(text, uuid, integer) TO service_role;
    GRANT EXECUTE ON FUNCTION public.renew_content_automation_lock(text, uuid, integer) TO service_role;
    GRANT EXECUTE ON FUNCTION public.owns_content_automation_lock(text, uuid) TO service_role;
    GRANT EXECUTE ON FUNCTION public.release_content_automation_lock(text, uuid) TO service_role;
  END IF;
END
$$;
