# California Benefits Finder

A consumer website that helps California residents find rebates, credits, discounts, free services, financing programs, and other benefits they may qualify for.

This is an early MVP. Eligibility will be determined by deterministic rules — not by an AI model.

The product name and tagline live in `lib/config/site.ts` so branding can be changed in one place.

## Current status

**Milestone 6** is in place:

- Next.js App Router, TypeScript, and Tailwind CSS
- Global layout, design system, and homepage
- PostgreSQL schema, migrations, and sample seed data
- Program directory at `/programs` and detail pages at `/programs/[slug]`
- Server-only Supabase reads using the publishable key and RLS
- Deterministic eligibility engine in `lib/eligibility/` (no AI, no scores)
- Consumer questionnaire at `/check` that collects a `UserProfile` in the browser
- `POST /api/match` and `/results` that run the engine against that profile

Admin, accounts, saved profiles, analytics, and application submission are not built yet.

## Local development

1. Copy environment variables:

```bash
cp .env.example .env.local
```

2. Fill in your Supabase values when you have a project. The app builds and the homepage runs without them. Database helpers throw a clear error if they are called while Supabase is unconfigured — they do not return fake programs.

3. Install and start:

```bash
npm install
npm run dev
```

Open [http://localhost:43123](http://localhost:43123).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server on port 43123 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest unit tests (no network) |

## Environment variables

| Variable | Where it is used | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Public Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser + server | Publishable (public) key |
| `SUPABASE_SECRET_KEY` | Server only | Never expose this to the browser. Needed later for admin writes. |
| `ADMIN_PASSWORD` | Server only | Simple admin gate in a later milestone |

Helpers for reading these values are in `lib/supabase/env.ts`. The server client is in `lib/supabase/server.ts`.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the project URL, publishable key, and secret key into `.env.local`.
3. In the Supabase SQL editor, run `supabase/migrations/20260906120000_create_program_tables.sql`.
4. Then run `supabase/seed.sql`.

If you use the Supabase CLI with this folder as the project root:

```bash
npx supabase db query --file supabase/migrations/20260906120000_create_program_tables.sql
npx supabase db query --file supabase/seed.sql
```

The exact CLI command can vary by CLI version; the SQL editor path above always works.

### Seed data is sample-only

Seed programs are **fictional test fixtures**. Names are prefixed with `SAMPLE:` and descriptions say they are not verified government benefits. Replace them with researched programs before any public launch.

Default consumer reads (publishable key + RLS) return active, non-expired programs only. The expired solar sample exists so you can confirm expired rows stay hidden.

### Row Level Security

- Anonymous and signed-in users may `SELECT` programs where `active = TRUE` and `status <> 'EXPIRED'`.
- They may also read rules, locations, sources, and relationships that belong to those programs.
- They cannot `INSERT`, `UPDATE`, or `DELETE` catalog data.
- Admin writes will use the secret key from server-side code, which bypasses RLS.

## Eligibility engine

Business logic lives in `lib/eligibility/` — not in React components. It evaluates a `UserProfile` against program rules and locations and returns machine-readable statuses only:

- Rule: `PASS` | `FAIL` | `UNKNOWN`
- Program: `LIKELY_ELIGIBLE` | `POSSIBLY_ELIGIBLE` | `NOT_ELIGIBLE`

There are no percentages, probabilities, or “you qualify” claims. Missing profile values stay missing (`undefined` is never treated as `false` or `0`). Tests use local fixtures and do not call Supabase.

### Operators

`equals`, `not_equals`, `greater_than`, `greater_than_or_equal`, `less_than`, `less_than_or_equal`, `in`, `not_in`, `contains`, `is_true`, `is_false`, `exists`, `not_exists`.

Strings are compared after trim, case-insensitively. Numbers compare numerically. Booleans compare only to booleans. Malformed rule values return `UNKNOWN` instead of throwing.

`contains`: profile string contains rule string; profile array contains a rule scalar; profile array intersects a rule array.

`exists` / `not_exists`: a missing field FAILs `exists` and PASSes `not_exists`. A present `false` or `0` counts as existing.

### Groups

Rules that share `rule_group` use that group’s `group_operator`.

- AND: any FAIL → FAIL; else any UNKNOWN → UNKNOWN; else PASS
- OR: any PASS → PASS; else any UNKNOWN → UNKNOWN; else FAIL

Required groups are then combined with AND. Optional rules (`required = false`) are explained but never make a program `NOT_ELIGIBLE`.

### Geography

Locations are evaluated separately from rules. No GIS and no external APIs.

- Statewide California programs PASS immediately, unless a STATE row is not California
- Same location type = OR alternatives (any matching ZIP, county, city, or utility)
- Different restrictive types (COUNTY, CITY, ZIP, ELECTRIC_UTILITY, GAS_UTILITY) are AND’d — ZIP + utility both listed means both must be satisfied
- Across types: any FAIL → FAIL; else any UNKNOWN → UNKNOWN; else PASS
- STATE `CA` is documentary for this California-only product; it does not make a ZIP-limited program match everyone
- Known conflict → FAIL; required location missing → UNKNOWN
- Utility is never inferred from ZIP

`matchPrograms()` buckets evaluations into likely / possibly / not eligible. It does not calculate total savings.

## Questionnaire

`/check` collects a `UserProfile` one question at a time. Logic lives in `lib/questionnaire/`; UI lives in `components/questionnaire/`.

- Required: ZIP, household size, housing status, property type
- Optional questions can be skipped or answered “Prefer not to say” / “Not sure”
- Missing answers stay `undefined` — never coerced to `false` or `0`
- Vehicle questions appear only when interests include Vehicles / EVs (or Everything, which selects every interest category)
- Home-upgrade / solar / repair interests set `home_improvement_interest = true` without an extra question
- Progress is “Step X of Y” using the current path (12 steps, or 16 with vehicles)
- Answers are stored in `sessionStorage` for this browser tab only (`cbf.questionnaire.v1`). Start over clears them. Nothing is sent to analytics or Supabase.
- Southern California Edison is stored as `SCE`. No gas service is stored as `NONE` so it is not confused with a missing answer.

The completion screen links to `/results`. Matching is not run until the resident opens that page.

## Matching API and results

`POST /api/match` accepts `{ "profile": { ... } }`. The server sanitizes known `UserProfile` fields (`lib/eligibility/validate-profile.ts`), loads active programs plus rules and locations (`lib/programs/get-matchable-program-data.ts`), and calls `matchPrograms()`. NOT_ELIGIBLE programs are omitted from the consumer response.

ZIP, household size, housing status, and property type are required. Invalid optional fields are dropped. Booleans are not coerced from strings. The profile is not written to Supabase or logged.

`/results` reads the questionnaire from `sessionStorage` and POSTs it. Opening `/results` without a completed profile shows a questionnaire CTA. A failed API call is distinct from zero matches. There is no grand-total savings number. Loans and financing are labeled repayable.

## Next milestone

**Milestone 7:** Admin and catalog-management tools, or optional refinement of missing-information follow-ups.
