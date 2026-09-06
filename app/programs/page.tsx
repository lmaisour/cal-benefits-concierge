import type { Metadata } from "next";
import { ProgramCard } from "@/components/programs/program-card";
import { ProgramFilters } from "@/components/programs/program-filters";
import { filterAndSortPrograms, type ProgramSort } from "@/lib/programs/filter-programs";
import { getActivePrograms } from "@/lib/programs/get-active-programs";
import { siteConfig } from "@/lib/config/site";
import { BENEFIT_TYPES, PROGRAM_STATUSES } from "@/types/database";
import type { BenefitType, ProgramStatus } from "@/types/database";
import type { Program } from "@/types/program";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse California benefit programs",
  description:
    "Browse sample California rebates, credits, discounts, and assistance programs. Confirm details on each official program site.",
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
  let loadError: string | null = null;
  try {
    programs = await getActivePrograms();
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

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-sm font-semibold tracking-wide text-primary uppercase">
        Program directory
      </p>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-foreground sm:text-4xl">
        Browse all programs
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        These listings include fictional SAMPLE programs for testing. They are
        not verified government benefits. Always confirm eligibility with the
        official administrator.
      </p>

      {loadError ? (
        <div
          className="mt-8 rounded-2xl border border-border bg-card p-6"
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
          <div className="mt-8">
            <ProgramFilters
              query={query}
              category={category}
              benefitType={benefitType}
              status={status}
              sort={sort}
            />
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            {visible.length} of {programs.length} programs
          </p>
          {programs.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-border bg-card p-8">
              <h2 className="font-serif text-xl font-semibold">No programs yet</h2>
              <p className="mt-2 text-muted-foreground">
                There are no active programs in the directory right now.
              </p>
            </div>
          ) : visible.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-border bg-card p-8">
              <h2 className="font-serif text-xl font-semibold">No matching programs</h2>
              <p className="mt-2 text-muted-foreground">
                Try clearing filters or searching a different name.
              </p>
            </div>
          ) : (
            <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {visible.map((program) => (
                <li key={program.id}>
                  <ProgramCard program={program} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <p className="mt-10 max-w-3xl text-sm text-muted-foreground">
        {siteConfig.disclaimer}
      </p>
    </section>
  );
}
