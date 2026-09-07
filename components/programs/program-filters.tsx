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

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-base text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const labelClass = "text-sm font-medium text-foreground";

export function ProgramFilters({ query }: { query: ProgramDirectoryQuery }) {
  return (
    <form
      method="get"
      action={siteConfig.urls.programs}
      className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(28,25,23,0.05),0_10px_24px_rgba(28,25,23,0.04)] sm:p-6"
    >
      <DirectoryQueryFields
        query={query}
        omit={["query", "category", "benefitType", "status", "sort"]}
      />
      <div>
        <label htmlFor="program-search" className={labelClass}>
          Search programs
        </label>
        <input
          id="program-search"
          key={query.query}
          name="q"
          type="search"
          defaultValue={query.query}
          placeholder="Search by name, administrator, or description"
          className={`${fieldClass} h-12 text-lg`}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <label htmlFor="program-category" className={labelClass}>
            Category
          </label>
          <select
            id="program-category"
            name="category"
            defaultValue={query.category}
            className={fieldClass}
          >
            <option value="">All categories</option>
            {programCategories.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
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

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <a
          href={programsDirectoryHref({ zip: query.zip })}
          className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-base font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Clear filters
        </a>
        <Button type="submit">Apply filters</Button>
      </div>
    </form>
  );
}
