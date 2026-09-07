import { Button } from "@/components/ui/button";
import { DirectoryQueryFields } from "@/components/programs/directory-query-fields";
import {
  programsDirectoryHref,
  type ProgramDirectoryQuery,
} from "@/lib/programs/filter-programs";
import {
  formatDirectoryPlaceLine,
  type DirectoryPlace,
} from "@/lib/programs/location-context";
import { siteConfig } from "@/lib/config/site";

const fieldClass =
  "w-full rounded-xl border border-border bg-background px-3.5 py-3 text-lg text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function ZipForm({
  query,
  zipError,
  zipDraft,
  compact = false,
}: {
  query: ProgramDirectoryQuery;
  zipError: string | null;
  zipDraft: string;
  compact?: boolean;
}) {
  return (
    <form method="get" action={siteConfig.urls.programs} className={compact ? "" : "mt-6"}>
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
            className={`${fieldClass} mt-1.5 ${compact ? "h-11 py-2 text-base" : ""}`}
          />
        </div>
        <Button type="submit" size={compact ? "md" : "lg"} className="w-full sm:w-auto">
          Find programs
        </Button>
      </div>
      {zipError ? (
        <p id="program-zip-error" className="mt-2 text-sm text-foreground" role="alert">
          {zipError}
        </p>
      ) : compact ? null : (
        <p id="program-zip-help" className="mt-2 text-sm text-muted-foreground">
          We&apos;ll show programs matched to your ZIP, city, or county, plus
          statewide California programs. This is not a complete list.
        </p>
      )}
    </form>
  );
}

export function LocationFinder({
  query,
  zipError,
  zipDraft,
  place,
}: {
  query: ProgramDirectoryQuery;
  zipError: string | null;
  zipDraft: string;
  place?: DirectoryPlace;
}) {
  const clearZipHref = programsDirectoryHref({ ...query, zip: "" });
  const compact = Boolean(query.zip && !zipError);
  const placeLine = place ? formatDirectoryPlaceLine(place) : "";

  if (compact) {
    return (
      <section
        aria-labelledby="location-finder-heading"
        className="rounded-2xl border border-primary/15 bg-hero px-4 py-3 shadow-[0_1px_2px_rgba(28,25,23,0.05),0_10px_24px_rgba(28,25,23,0.04)] sm:px-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2
              id="location-finder-heading"
              className="font-serif text-lg font-semibold tracking-tight text-foreground"
            >
              Benefits near you
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{placeLine}</p>
          </div>
          <details className="sm:min-w-64">
            <summary className="cursor-pointer text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Change location
            </summary>
            <div className="mt-3">
              <ZipForm query={query} zipError={zipError} zipDraft={zipDraft} compact />
              <p className="mt-2 text-sm">
                <a
                  href={clearZipHref}
                  className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Clear ZIP code
                </a>
              </p>
            </div>
          </details>
        </div>
        <p id="program-zip-help" className="mt-2 text-sm text-muted-foreground">
          This is not a complete list of every local benefit.
        </p>
      </section>
    );
  }

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
      <ZipForm query={query} zipError={zipError} zipDraft={zipDraft} />
    </section>
  );
}
