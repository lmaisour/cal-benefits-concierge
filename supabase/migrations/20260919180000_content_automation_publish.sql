-- Autonomous publication status and timestamp.
-- Does not enable automation or publication. No program facts are changed.

ALTER TABLE public.content_automation_executions
  DROP CONSTRAINT IF EXISTS content_automation_executions_status_check;

ALTER TABLE public.content_automation_executions
  ADD CONSTRAINT content_automation_executions_status_check CHECK (
    status IN (
      'STARTED',
      'NOT_DUE',
      'LOCKED',
      'GENERATED',
      'BLOCKED',
      'ERROR',
      'COMPLETED_DRY_RUN',
      'PUBLISHED'
    )
  );

ALTER TABLE public.content_automation_executions
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

COMMENT ON COLUMN public.content_automation_executions.published_at IS
  'Timestamp of the confirmed successful autonomous publication. NULL if this execution did not publish.';
