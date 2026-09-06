# California Benefits Finder

A consumer website that helps California residents find rebates, credits, discounts, free services, financing programs, and other benefits they may qualify for.

This is an early MVP. Eligibility will be determined by deterministic rules — not by an AI model.

The product name and tagline live in `lib/config/site.ts` so branding can be changed in one place.

## Current status

**Milestone 3** is in place:

- Next.js App Router, TypeScript, and Tailwind CSS
- Global layout, design system, and homepage
- PostgreSQL schema, migrations, and sample seed data
- Program directory at `/programs` and detail pages at `/programs/[slug]`
- Server-only Supabase reads using the publishable key and RLS

The questionnaire, matching engine, results page, and admin UI are not built yet.

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

## Next milestone

**Milestone 4:** Deterministic eligibility evaluator and unit tests.
