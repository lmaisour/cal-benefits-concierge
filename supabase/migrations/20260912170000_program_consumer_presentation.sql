-- Consumer-facing presentation fields. Official name and administrator
-- remain the source of truth. These columns are nullable for gradual rollout.

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS consumer_headline TEXT,
  ADD COLUMN IF NOT EXISTS administrator_display_name TEXT,
  ADD COLUMN IF NOT EXISTS audience_tags TEXT[];

COMMENT ON COLUMN public.programs.consumer_headline IS
  'Short consumer benefit headline for public UI. Does not replace programs.name.';
COMMENT ON COLUMN public.programs.administrator_display_name IS
  'Optional shorter administrator label. Does not replace programs.administrator.';
COMMENT ON COLUMN public.programs.audience_tags IS
  'Explicit consumer audience tags seeded from verified facts. Null or empty means no tag row.';

-- Seed only the reviewed initial programs.
UPDATE public.programs
SET
  consumer_headline = 'Free rides for 90 days',
  administrator_display_name = 'LA Metro',
  audience_tags = ARRAY['Low income', 'Transit', 'Los Angeles County']
WHERE external_id = 'LA-VEH-METRO-LIFE';

UPDATE public.programs
SET
  consumer_headline = 'Free front-yard landscaping',
  administrator_display_name = 'LADWP',
  audience_tags = ARRAY['Single-family home', 'LADWP water', 'Homeowner or renter'],
  benefit_summary = 'Free front-yard landscaping'
WHERE external_id = 'LADWP-WATER-LEAP';

UPDATE public.programs
SET
  consumer_headline = 'Get up to 7 free trees',
  administrator_display_name = 'City Plants',
  audience_tags = ARRAY['Los Angeles', 'Free trees']
WHERE external_id = 'LA-HOME-CITY-PLANTS';

UPDATE public.programs
SET
  consumer_headline = 'Free home energy upgrades',
  audience_tags = ARRAY['Low income'],
  benefit_summary = 'Free home energy upgrades'
WHERE external_id = 'CA-UTIL-ESA';
