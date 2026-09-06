import type { Metadata } from "next";
import { ProgramCard } from "@/components/programs/program-card";
import { ProgramFilters } from "@/components/programs/program-filters";
import { ButtonLink } from "@/components/ui/button";
import { filterAndSortPrograms, type ProgramSort } from "@/lib/programs/filter-programs";
import {
  getActivePrograms,
  getLocationsForPrograms,
} from "@/lib/programs/get-active-programs";
import { siteConfig } from "@/lib/config/site";
import { BENEFIT_TYPES, PROGRAM_STATUSES } from "@/types/database";
import type { BenefitType, ProgramStatus } from "@/types/database";
import type { Program, ProgramLocation } from "@/types/program";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse California benefit programs",
  description:
    "Browse California rebates, credits, discounts, and assistance programs. Confirm details on each official program site.",
};

function isBenefitType(value: string): value is BenefitType {
  return (BENEFIT_TYPES as readonly string[]).includes(value);
}

function isStatus(value: string): value is ProgramStatus {
  return (PROGRAM_STATUSES as readonly string[]).includes(value) && value !== "EXPIRED";
}

function isSort(value: string): value is ProgramSort {
  return value === "value" || value === "verified" || value === "alpha";
}

function locationsByProgram(locations: ProgramLocation[]): Map<string, ProgramLocation[]> {
  const grouped = new Map<string, ProgramLocation[]>();
  for (const location of locations) {
    const current = grouped.get(location.program_id) ?? [];
    current.push(location);
    grouped.set(location.program_id, current);
  }
  return grouped;
}

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    benefit?: string;
    status?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const category = params.category ?? "";
  const benefitType = params.benefit && isBenefitType(params.benefit) ? params.benefit : "";
  const status = params.status && isStatus(params.status) ? params.status : "";
  const sort: ProgramSort = params.sort && isSort(params.sort) ? params.sort : "verified";

  let programs: Program[] = [];
  let locations: ProgramLocation[] = [];
  let loadError: string | null = null;
  try {
    programs = await getActivePrograms();
    locations = await getLocationsForPrograms(programs.map((program) => program.id));
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load programs.";
  }

  const visible = filterAndSortPrograms(programs, {
    query,
    category,
    benefitType,
    status,
    sort,
  });
  const locationMap = locationsByProgram(locations);
  const categoryCount = new Set(programs.map((program) => program.category)).size;

  return (
    <section className="pb-16">
      <div className="border-b border-border bg-hero">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">
            California benefits & incentives
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Explore programs that could save you money
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Browse current California rebates, credits, discounts, and assistance
            programs, or answer a few questions to see which ones may apply to
            your household. This is not a complete list of every California
            benefit.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href={siteConfig.urls.check} size="lg">
              Check what I qualify for
            </ButtonLink>
            <ButtonLink href="#program-directory" variant="secondary" size="lg">
              Browse all programs
            </ButtonLink>
          </div>
          {!loadError && programs.length > 0 ? (
            <dl className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/80 bg-card/80 px-4 py-3">
                <dt className="text-sm text-muted-foreground">Current programs</dt>
                <dd className="mt-1 font-serif text-2xl font-semibold text-foreground">
                  {programs.length}
                </dd>
              </div>
              <div className="rounded-2xl border border-border/80 bg-card/80 px-4 py-3">
                <dt className="text-sm text-muted-foreground">Categories</dt>
                <dd className="mt-1 font-serif text-2xl font-semibold text-foreground">
                  {categoryCount}
                </dd>
              </div>
              <div className="rounded-2xl border border-border/80 bg-card/80 px-4 py-3">
                <dt className="text-sm text-muted-foreground">Verified</dt>
                <dd className="mt-1 font-serif text-2xl font-semibold text-foreground">
                  September 2026
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
      </div>

      <div id="program-directory" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-10 sm:px-6">
        {loadError ? (
          <div
            className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            role="alert"
          >
            <h2 className="font-serif text-xl font-semibold text-foreground">
              Programs could not be loaded
            </h2>
            <p className="mt-2 text-muted-foreground">{loadError}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Check that Supabase is configured and the database is reachable.
            </p>
          </div>
        ) : (
          <>
            <ProgramFilters
              query={query}
              category={category}
              benefitType={benefitType}
              status={status}
              sort={sort}
            />
            <p className="mt-6 text-sm text-muted-foreground">
              Showing {visible.length} of {programs.length} programs
            </p>
            {programs.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
                <h2 className="font-serif text-2xl font-semibold">No programs yet</h2>
                <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                  There are no active programs in the directory right now.
                </p>
              </div>
            ) : visible.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
                <h2 className="font-serif text-2xl font-semibold">No matching programs</h2>
                <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                  Try a different search, or clear filters to see the full directory.
                </p>
                <div className="mt-6">
                  <ButtonLink href={siteConfig.urls.programs} variant="secondary">
                    Clear filters
                  </ButtonLink>
                </div>
              </div>
            ) : (
              <ul className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                {visible.map((program) => (
                  <li key={program.id}>
                    <ProgramCard
                      program={program}
                      locations={locationMap.get(program.id) ?? []}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <p className="mt-12 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {siteConfig.disclaimer}
        </p>
      </div>
    </section>
  );
}
