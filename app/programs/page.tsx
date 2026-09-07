import type { Metadata } from "next";
import { DirectoryQualifyCta } from "@/components/programs/directory-qualify-cta";
import { LocationFinder } from "@/components/programs/location-finder";
import { ProgramCard } from "@/components/programs/program-card";
import { ProgramFilters } from "@/components/programs/program-filters";
import { ButtonLink } from "@/components/ui/button";
import {
  applyDirectoryLocation,
  countDirectoryBuckets,
  groupDirectoryResults,
  LOCATION_SECTION_COPY,
  type DirectoryLocationResult,
  type GeographicBucket,
} from "@/lib/programs/directory-location";
import {
  filterAndSortPrograms,
  type ProgramDirectoryQuery,
  type ProgramSort,
} from "@/lib/programs/filter-programs";
import {
  getActivePrograms,
  getLocationsForPrograms,
} from "@/lib/programs/get-active-programs";
import {
  parseDirectoryZip,
  resolveDirectoryPlaceFromZip,
  type DirectoryPlace,
} from "@/lib/programs/location-context";
import { siteConfig } from "@/lib/config/site";
import { BENEFIT_TYPES, PROGRAM_STATUSES } from "@/types/database";
import type { BenefitType, ProgramStatus } from "@/types/database";
import { cn } from "@/lib/utils/cn";
import type { Program, ProgramLocation } from "@/types/program";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse California benefit programs",
  description:
    "Enter your ZIP code to find California state and local rebates, credits, discounts, and assistance programs. Confirm details on each official program site.",
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

function ProgramGrid({
  items,
  locationMap,
  showMatch,
  focusPlace,
  className = "mt-4",
}: {
  items: DirectoryLocationResult[];
  locationMap: Map<string, ProgramLocation[]>;
  showMatch: boolean;
  focusPlace?: DirectoryPlace;
  className?: string;
}) {
  return (
    <ul className={cn("grid grid-cols-1 gap-5 md:grid-cols-2", className)}>
      {items.map(({ program, bucket }) => (
        <li key={program.id}>
          <ProgramCard
            program={program}
            locations={locationMap.get(program.id) ?? []}
            locationMatch={showMatch ? bucket : undefined}
            focusPlace={focusPlace}
          />
        </li>
      ))}
    </ul>
  );
}

function locationResultsHeading(zip: string, city?: string): string {
  if (city) {
    return `Programs we found for ${zip} · ${city}`;
  }
  return `Programs we found for ${zip}`;
}

function bucketCountLabel(kind: GeographicBucket, count: number): string {
  if (kind === "local") {
    return `${count} program${count === 1 ? "" : "s"} in your area`;
  }
  if (kind === "statewide") {
    return `${count} California program${count === 1 ? "" : "s"}`;
  }
  return `${count} program${count === 1 ? "" : "s"} may also be available`;
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
    zip?: string;
  }>;
}) {
  const params = await searchParams;
  const parsedZip = parseDirectoryZip(params.zip);
  const directoryQuery: ProgramDirectoryQuery = {
    query: params.q ?? "",
    category: params.category ?? "",
    benefitType: params.benefit && isBenefitType(params.benefit) ? params.benefit : "",
    status: params.status && isStatus(params.status) ? params.status : "",
    sort: params.sort && isSort(params.sort) ? params.sort : "verified",
    zip: parsedZip.zip ?? "",
  };

  let programs: Program[] = [];
  let locations: ProgramLocation[] = [];
  let loadError: string | null = null;
  try {
    programs = await getActivePrograms();
    locations = await getLocationsForPrograms(programs.map((program) => program.id));
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load programs.";
  }

  const filtered = filterAndSortPrograms(programs, directoryQuery);
  const locationMap = locationsByProgram(locations);
  const place = parsedZip.zip ? resolveDirectoryPlaceFromZip(parsedZip.zip) : {};
  const located = applyDirectoryLocation(filtered, locationMap, place);
  const locationActive = Boolean(parsedZip.zip);
  const grouped = locationActive ? groupDirectoryResults(located) : [];
  const bucketCounts = countDirectoryBuckets(located);
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
            Enter your ZIP code to see state and local programs that may be
            available where you live, browse the full directory, or answer a few
            questions to check what may apply to your household. This is not a
            complete list of every California benefit.
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
            <LocationFinder
              query={directoryQuery}
              zipError={parsedZip.error}
              zipDraft={params.zip ?? ""}
              place={locationActive ? place : undefined}
            />
            <div className={locationActive ? "mt-4" : "mt-6"}>
              <ProgramFilters query={directoryQuery} />
            </div>
            {locationActive ? null : <DirectoryQualifyCta />}
            {locationActive ? (
              <div className="mt-5">
                <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
                  {locationResultsHeading(directoryQuery.zip, place.place ?? place.city)}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  {[
                    bucketCountLabel("local", bucketCounts.local),
                    bucketCountLabel("statewide", bucketCounts.statewide),
                    bucketCountLabel("unresolved", bucketCounts.unresolved),
                  ].join(" · ")}
                </p>
              </div>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">
                Showing {located.length} of {programs.length} programs
              </p>
            )}
            {programs.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
                <h2 className="font-serif text-2xl font-semibold">No programs yet</h2>
                <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                  There are no active programs in the directory right now.
                </p>
              </div>
            ) : located.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
                <h2 className="font-serif text-2xl font-semibold">No matching programs</h2>
                <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                  Try a different search, ZIP code, or clear filters to see the full
                  directory.
                </p>
                <div className="mt-6">
                  <ButtonLink href={siteConfig.urls.programs} variant="secondary">
                    Clear filters
                  </ButtonLink>
                </div>
                {locationActive ? <DirectoryQualifyCta quiet /> : null}
              </div>
            ) : locationActive ? (
              <div className="mt-6 space-y-8">
                {grouped
                  .filter((group) => group.kind === "local")
                  .map(({ kind, items }) => {
                    const copy = LOCATION_SECTION_COPY[kind];
                    return (
                      <section key={kind} aria-labelledby={`location-group-${kind}`}>
                        <h3
                          id={`location-group-${kind}`}
                          className="font-serif text-xl font-semibold tracking-tight text-foreground"
                        >
                          {copy.title}
                        </h3>
                        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                          {copy.description}
                        </p>
                        <ProgramGrid
                          items={items}
                          locationMap={locationMap}
                          showMatch
                          focusPlace={place}
                        />
                      </section>
                    );
                  })}
                <DirectoryQualifyCta quiet />
                {grouped
                  .filter((group) => group.kind !== "local")
                  .map(({ kind, items }) => {
                    const copy = LOCATION_SECTION_COPY[kind];
                    return (
                      <section key={kind} aria-labelledby={`location-group-${kind}`}>
                        <h3
                          id={`location-group-${kind}`}
                          className="font-serif text-xl font-semibold tracking-tight text-foreground"
                        >
                          {copy.title}
                        </h3>
                        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                          {copy.description}
                        </p>
                        <ProgramGrid
                          items={items}
                          locationMap={locationMap}
                          showMatch={false}
                        />
                      </section>
                    );
                  })}
              </div>
            ) : (
              <ProgramGrid
                items={located}
                locationMap={locationMap}
                showMatch={false}
                className="mt-6"
              />
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
