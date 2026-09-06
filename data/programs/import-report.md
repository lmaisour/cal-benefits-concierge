# Milestone 7A import report

Verification date: **September 6, 2026**.

Research baseline used: *California Consumer Incentives Database — Research Baseline Verified September 3, 2026*, plus live official-page checks on September 6, 2026.

This pass did **not** invent programs, amounts, or eligibility to reach 100. After verification the catalog contains **98 consumer-visible** records (`active = true`) and **10 inactive status fixtures**. That is **2 short of 100** consumer-visible programs. The shortfall is reported rather than filled with weaker records.

## Counts in the committed catalog

| Measure | Count |
| --- | ---: |
| Total programs imported | 108 |
| Consumer-visible (`active = true`) | 98 |
| ACTIVE status | 97 |
| UPCOMING (visible) | 1 (Property Tax Postponement; filing opens October 1, 2026) |
| WAITLIST (inactive fixtures) | 2 |
| PAUSED (inactive fixtures) | 2 |
| FUNDING_EXHAUSTED (inactive fixtures) | 1 |
| EXPIRED (inactive fixtures) | 5 |
| Inactive / expired retained | 10 |
| HIGH confidence | 96 |
| MEDIUM confidence | 12 |
| LOW confidence (active) | 0 |
| Official source rows | 153 |
| Programs with ≥2 official sources | 38 |
| Programs with eligibility rules | 55 |
| Programs with location rows | 108 |
| Programs with an application URL | 98 |
| Relationship rows | 12 |

## Programs by category

| Category | Count |
| --- | ---: |
| housing | 25 |
| home-energy | 21 |
| vehicles | 18 |
| family | 16 |
| utilities | 13 |
| water | 5 |
| taxes | 4 |
| food | 4 |
| communications | 2 |

## Programs by administrator / geography (active only)

Largest administrators in the active set:

- California Department of Social Services (10)
- California Public Utilities Commission (8)
- LADWP (5)
- PG&E (4)
- Franchise Tax Board (4)
- SCE, SMUD, LACDA (3 each)

Statewide programs use `statewide = true` and usually only a documentary `STATE = CA` location. Utility-limited programs use `ELECTRIC_UTILITY` / `GAS_UTILITY` with questionnaire values (`PG&E`, `SCE`, `SDG&E`, `LADWP`, `SMUD`, `SoCalGas`). County/city housing programs use a single restrictive type (usually `COUNTY`) so the engine does not AND unrelated geography rows.

## Import command

```bash
npm run import:programs
```

Dry run (validate + write JSON, no database write):

```bash
npx tsx scripts/import-programs.ts --dry-run
```

The script:

1. Validates the TypeScript catalog
2. Writes `data/programs/*.json`
3. Upserts programs by `external_id` using `SUPABASE_SECRET_KEY`
4. Replaces rules, locations, sources, and relationships for those programs
5. Deletes remaining `SAMPLE:` / `example.invalid` rows
6. Prints catalog and database counts

It never uses the browser Supabase client and does not log secrets.

### Live database note (September 6, 2026)

The configured Supabase project still has the Milestone 2 schema. `npm run import:programs` validated the catalog and wrote JSON, then stopped because `programs.external_id` does not exist yet. PostgREST/secret-key access cannot run `ALTER TABLE`. Apply `supabase/migrations/20260906200000_add_programs_external_id.sql` in the Supabase SQL editor, then rerun `npm run import:programs`. After that rerun, SAMPLE rows are deleted automatically.

## Records intentionally excluded

These were researched and **not** imported as active consumer programs:

| Record | Why excluded |
| --- | --- |
| Federal 30D / 25E / 25C / 25D / 30C | Expired for new September 2026 activity. Retained only as `active = false` EXPIRED fixtures. |
| HEEHRA Single-Family | Fully reserved / waitlisted. Inactive WAITLIST fixture. |
| HEEHRA Multifamily Stage 1 | New submissions paused. Inactive PAUSED fixture. |
| TECH SF standard heat pump / HPWH | Funding exhausted / reserved. Inactive FUNDING_EXHAUSTED fixture. |
| SGIP Residential Solar & Storage Equity | Waitlisted. Inactive WAITLIST fixture. |
| SoCalGas Gas Assistance Fund | Official page: “GAF is now closed.” Inactive PAUSED fixture. |
| AC Boost | Closed; no sufficiently specific current official status page beyond a generic CEC homepage. Not imported. |
| DCAP Financing Assistance (no-scrap) | Funding depleted / closed. Only the scrap pathway is imported as DCAP. |
| SCAQMD Replace Your Ride | Paused. |
| Sacramento and San Joaquin Valley CC4A | District pages paused or mostly closed; not imported as active. |
| CVRP / CVAP | Not current consumer pathways. |
| CalHome / HOME / CDBG / IRA as standalone records | Funding sources, not household applications. |
| Contra Costa Neighborhood Preservation | Not taking applications. |
| Monterey County FTHB | Suspended. |
| Placer FTHB | Closed application window. |
| Riverside City rehabilitation | Waitlisted. |
| ReCoverCA homebuyer | Funds allocated (July 7, 2026). Homeowner rehab remains imported. |
| Tulare ReCoverCA | Pointer-only; not a separate consumer program. |
| Anderson Housing Rehabilitation | No current official apply page. |
| Santa Clara County home repair | No current official apply page. |
| Riverside Fifth District FTHB | Not independently confirmed. |
| Mono County Homebuyer | Not independently confirmed in this pass. |
| CalVet Home Loans | Official page returned 500 at verification. |
| California College Promise Grant | Statewide CCCApply URL 404; campus pages only. |
| Chafee Grant | Official landing was not extractable as a stable consumer page in this pass. |
| CFAP 55+ expansion | Not until October 2027. |

Research areas that remain if a later pass wants to close the 2-program shortfall:

- Additional large municipal utilities (Anaheim, Riverside, Burbank, Glendale, Pasadena, IID, TID) after page-level verification
- Additional high-population city/county down-payment and repair programs with current apply pages
- Official CalVet / CCPG / Chafee pages if they are reachable and current

## Integration profiles (local engine, no guessed rules)

Profiles were run against the imported catalog through `matchPrograms` / `toMatchResponse`.

1. **Lower-income LA County homeowner (SCE / SoCalGas)** — CARE can be Likely because IOU utility rules pass and income is not encoded. LACDA Handyworker stays Possible (county is unknown). Homeowners’ exemption can be Likely.
2. **LADWP renter** — EZ-SAVE can be Likely (utility gate only). DAC-SASH does not match LADWP electric service. CARE can still appear via SoCalGas.
3. **First-EV buyer** — MyFirstEV can be Likely from `first_ev`. Dealer/channel requirements stay unresolved.
4. **Household omitting income** — Programs without income rules can still be Likely. That is an engine limitation, not a guessed income cutoff.
5. **Senior homeowner** — LACDA Senior Grant stays Possible without county. Age 62+ can pass. Homeowners’ exemption can be Likely.
6. **Solar / storage interest** — DAC-SASH may appear; SGIP equity does not, because it is inactive.
7. **Medical-energy need** — Medical Baseline can appear when `disability` is true and an IOU rule passes. SMUD-only medical discounts are not a separate invented program.
8. **First-time homebuyer** — CalHFA MyHome appears as **financing**, not free savings.

Expired federal credits, HEEHRA, TECH, and SGIP equity do not appear in consumer matching.

## Unresolved schema / engine limitations

- No FPL / AMI / CARE-table engine. Published percentage and household-size income tests stay in descriptions. Missing income rules make some statewide programs **Likely** for everyone, which is more confident than the research supports. We did not add guessed numeric cutoffs.
- Questionnaire does not collect county or city. COUNTY/CITY programs become Possible, not false Likely.
- Different location types are AND. Utility programs that serve electric **or** gas use OR rule groups, not two restrictive location types.
- CCA territories (CPA, MCE, Ava, 3CE) often have only `STATE = CA`, so geography can over-match. That is documented, not papered over with guessed ZIP lists.
- No CalEnviroScreen / DAC tract field. EBD and DAC-SASH cannot prove community eligibility.
- No dealer, immigration, or SSI-denial fields. Those stay unresolved.
- `GRANT` is not a benefit-type enum. Education grants use `OTHER`.
- `CLOSED` is not a status enum. Seasonal/closed hardship uses `PAUSED` + `active = false`.
- Consumer matching shows any `active = true` and `status <> EXPIRED` row, including UPCOMING.
- DCAP is statewide while district CC4A programs also exist; residents of those districts may see both until a district-exclusion field exists.
- CARB vs DCAP stacking language conflicts. Relationships are `CONDITIONALLY_STACKABLE` with notes, not an optimizer.

## SAMPLE removal

Once the real catalog exceeded 50 active programs:

- `supabase/seed.sql` no longer inserts SAMPLE consumer rows
- The import script deletes live `SAMPLE:` / `example.invalid` rows
- Tests keep SAMPLE fixtures only under `lib/eligibility/__tests__`

## Migrations

- `supabase/migrations/20260906120000_create_program_tables.sql` (existing)
- `supabase/migrations/20260906200000_add_programs_external_id.sql` — adds nullable unique `programs.external_id`
