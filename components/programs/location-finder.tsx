import { Button } from "@/components/ui/button";
import { DirectoryQueryFields } from "@/components/programs/directory-query-fields";
import {
  programsDirectoryHref,
  type ProgramDirectoryQuery,
} from "@/lib/programs/filter-programs";
import { siteConfig } from "@/lib/config/site";

const fieldClass =
  "w-full rounded-xl border border-border bg-background px-3.5 py-3 text-lg text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function LocationFinder({
  query,
  zipError,
  zipDraft,
}: {
  query: ProgramDirectoryQuery;
  zipError: string | null;
  zipDraft: string;
}) {
  const clearZipHref = programsDirectoryHref({ ...query, zip: "" });

  return (
    <section
      aria-labelledby="location-finder-heading"
      className="rounded-2xl border border-primary/15 bg-hero p-5 shadow-[0_1px_2px_rgba(28,25,23,0.05),0_10px_24px_rgba(28,25,23,0.04)] sm:p-6"
    >
      <h2
        id="location-finder-heading"
        className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
      >
        Find benefits available where you live
      </h2>
      <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
        Enter your ZIP code to find state and local programs that may be available
        in your area.
      </p>

      <form method="get" action={siteConfig.urls.programs} className="mt-6">
        <DirectoryQueryFields query={query} omit={["zip"]} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="program-zip" className="text-sm font-medium text-foreground">
              ZIP code
            </label>
            <input
              id="program-zip"
              key={zipDraft}
              name="zip"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              pattern="[0-9]{5}"
              maxLength={5}
              defaultValue={zipDraft}
              placeholder="94110"
              aria-invalid={zipError ? true : undefined}
              aria-describedby={zipError ? "program-zip-error" : "program-zip-help"}
              className={`${fieldClass} mt-1.5`}
            />
          </div>
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            Find programs
          </Button>
        </div>
        {zipError ? (
          <p id="program-zip-error" className="mt-2 text-sm text-foreground" role="alert">
            {zipError}
          </p>
        ) : (
          <p id="program-zip-help" className="mt-2 text-sm text-muted-foreground">
            We&apos;ll show programs matched to your ZIP, city, or county, plus
            statewide California programs. This is not a complete list.
          </p>
        )}
      </form>

      {query.zip ? (
        <p className="mt-4 text-sm">
          <a
            href={clearZipHref}
            className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Clear ZIP code
          </a>
        </p>
      ) : null}
    </section>
  );
}
