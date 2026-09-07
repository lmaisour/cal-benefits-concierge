import { programCategories } from "@/lib/config/categories";
import { BENEFIT_TYPES } from "@/types/database";
import {
  programsDirectoryHref,
  type ProgramDirectoryQuery,
} from "@/lib/programs/filter-programs";
import {
  BENEFIT_TYPE_LABELS,
  CONSUMER_PROGRAM_STATUSES,
  STATUS_LABELS,
} from "@/lib/programs/labels";
import { Button } from "@/components/ui/button";
import { DirectoryQueryFields } from "@/components/programs/directory-query-fields";
import { siteConfig } from "@/lib/config/site";
import { cn } from "@/lib/utils/cn";

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-base text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const labelClass = "text-sm font-medium text-foreground";

const CATEGORY_CHIPS = [
  { slug: "", label: "All" },
  { slug: "vehicles", label: "Vehicles" },
  { slug: "home-energy", label: "Home & Energy" },
  { slug: "utilities", label: "Utility Bills" },
  { slug: "housing", label: "Housing" },
  { slug: "family", label: "Family" },
  { slug: "food", label: "Food" },
  { slug: "taxes", label: "Taxes" },
  { slug: "water", label: "Water" },
  { slug: "communications", label: "Communications" },
] as const;

export function ProgramFilters({ query }: { query: ProgramDirectoryQuery }) {
  const moreFiltersOpen = Boolean(
    query.status || query.benefitType || query.sort !== "verified",
  );

  return (
    <form
      method="get"
      action={siteConfig.urls.programs}
      className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(28,25,23,0.05),0_10px_24px_rgba(28,25,23,0.04)]"
    >
      <DirectoryQueryFields
        query={query}
        omit={["query", "category", "benefitType", "status", "sort"]}
      />
      <div>
        <label htmlFor="program-search" className={labelClass}>
          Search programs
        </label>
        <div className="mt-1.5 flex flex-col gap-3 sm:flex-row">
          <input
            id="program-search"
            key={query.query}
            name="q"
            type="search"
            defaultValue={query.query}
            placeholder="Search by name, administrator, or description"
            className={`${fieldClass} mt-0 h-10 flex-1`}
          />
          <input type="hidden" name="category" value={query.category} />
          <Button type="submit" className="h-10 w-full sm:w-auto">
            Search
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <p className={labelClass} id="program-category-label">
          Category
        </p>
        <ul
          className="mt-2 flex flex-wrap gap-2"
          aria-labelledby="program-category-label"
        >
          {CATEGORY_CHIPS.map((chip) => {
            const selected = query.category === chip.slug;
            return (
              <li key={chip.label}>
                <a
                  href={programsDirectoryHref({ ...query, category: chip.slug })}
                  aria-current={selected ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-muted/80",
                  )}
                >
                  {chip.label}
                </a>
              </li>
            );
          })}
        </ul>
        {query.category &&
        !CATEGORY_CHIPS.some((chip) => chip.slug === query.category) ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Showing {programCategories.find((item) => item.slug === query.category)?.label ?? query.category}
          </p>
        ) : null}
      </div>

      <details
        className="mt-3 rounded-xl border border-border bg-background px-3 py-2"
        open={moreFiltersOpen || undefined}
      >
        <summary className="cursor-pointer text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          More filters
        </summary>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="program-status" className={labelClass}>
              Status
            </label>
            <select
              id="program-status"
              name="status"
              defaultValue={query.status}
              className={fieldClass}
            >
              <option value="">All statuses</option>
              {CONSUMER_PROGRAM_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {STATUS_LABELS[item]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="program-benefit" className={labelClass}>
              Benefit type
            </label>
            <select
              id="program-benefit"
              name="benefit"
              defaultValue={query.benefitType}
              className={fieldClass}
            >
              <option value="">All benefit types</option>
              {BENEFIT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {BENEFIT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="program-sort" className={labelClass}>
              Sort
            </label>
            <select id="program-sort" name="sort" defaultValue={query.sort} className={fieldClass}>
              <option value="verified">Recently verified</option>
              <option value="value">Highest potential savings</option>
              <option value="alpha">Alphabetical</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <a
            href={programsDirectoryHref({ zip: query.zip })}
            className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-base font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Clear filters
          </a>
          <Button type="submit">Apply filters</Button>
        </div>
      </details>
    </form>
  );
}
