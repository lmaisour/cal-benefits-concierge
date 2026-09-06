# California Benefits Finder

A consumer website that helps California residents find rebates, credits, discounts, free services, financing programs, and other benefits they may qualify for.

This is an early MVP. Eligibility will be determined by deterministic rules — not by an AI model.

The product name and tagline live in `lib/config/site.ts` so branding can be changed in one place.

## Current status

**Milestone 1** is in place:

- Next.js App Router, TypeScript, and Tailwind CSS
- Global layout and design system
- Homepage explaining the value proposition
- Supabase environment-variable contract (no database yet)

Later milestones add the program database, eligibility engine, questionnaire, results, and admin tools.

## Local development

1. Copy environment variables:

```bash
cp .env.example .env.local
```

2. Fill in your Supabase values when you have a project. The app currently builds and runs without them.

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
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Never expose this to the browser |
| `ADMIN_PASSWORD` | Server only | Simple admin gate in a later milestone |

Helpers for reading these values are in `lib/supabase/env.ts`.

## Next milestone

**Milestone 2:** PostgreSQL schema, migrations, TypeScript database types, and seed programs.
