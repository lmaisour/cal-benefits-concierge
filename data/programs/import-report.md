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
| Programs with unmodeled required criteria | 107 |
| Fully modeled required criteria (can become Likely) | 1 (Homeowners’ Property Tax Exemption) |
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

1. **Lower-income LA County homeowner (SCE / SoCalGas)** — CARE stays Possible because the 200% FPL table is unmodeled. LACDA Handyworker stays Possible (county is unknown). Homeowners’ exemption can be Likely.
2. **LADWP renter** — EZ-SAVE stays Possible (income table unmodeled). DAC-SASH does not match LADWP electric service. CARE can still appear as Possible via SoCalGas.
3. **First-EV buyer** — MyFirstEV stays Possible even when `first_ev` passes, because participating-seller and vehicle rules are unmodeled.
4. **Household omitting income** — Programs with executable income rules stay Possible. Programs with unmodeled income tables also stay Possible instead of becoming false Likely.
5. **Senior homeowner** — LACDA Senior Grant stays Possible without county. Age 62+ can pass. Homeowners’ exemption can be Likely.
6. **Solar / storage interest** — DAC-SASH may appear as Possible; SGIP equity does not, because it is inactive.
7. **Medical-energy need** — Medical Baseline can appear as Possible when `disability` is true and an IOU rule passes. A clinician certification is still unmodeled.
8. **First-time homebuyer** — CalHFA MyHome appears as **financing**, not free savings, and stays Possible because AMI / first-time-buyer rules are unmodeled.

Expired federal credits, HEEHRA, TECH, and SGIP equity do not appear in consumer matching.

## Conservative unmodeled-criteria handling

Required eligibility that the current questionnaire cannot execute is stored on the program row:

- `has_unmodeled_required_criteria`
- `unmodeled_required_criteria_summary` (consumer wording only)

`evaluateProgram()` still returns NOT_ELIGIBLE on any executable required FAIL. Otherwise UNKNOWN executable rules stay Possible. If every executable required rule and geography PASSes but the unmodeled flag is true, the program stays Possible. Unmodeled text is never scored as PASS or FAIL.

Possible matches caused by unmodeled criteria include “Additional program requirements need to be confirmed.” plus the program summary.

## Unresolved schema / engine limitations

- No FPL / AMI / CARE-table engine. Published percentage and household-size income tests stay in descriptions and, when required, set `has_unmodeled_required_criteria`. Those programs stay **Possible**, not false Likely. We did not add guessed numeric cutoffs.
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
- `supabase/migrations/20260906210000_add_unmodeled_required_criteria.sql` — adds `has_unmodeled_required_criteria` and `unmodeled_required_criteria_summary`

Do not apply these migrations or `npm run import:programs` until this code is confirmed on `lmaisour/cal-benefits-concierge`.
