import { programCategories } from "@/lib/config/categories";
import { BENEFIT_TYPES } from "@/types/database";
import type { ProgramSort } from "@/lib/programs/filter-programs";
import {
  BENEFIT_TYPE_LABELS,
  CONSUMER_PROGRAM_STATUSES,
  STATUS_LABELS,
} from "@/lib/programs/labels";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/config/site";

const fieldClass =
  "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ProgramFilters({
  query,
  category,
  benefitType,
  status,
  sort,
}: {
  query: string;
  category: string;
  benefitType: string;
  status: string;
  sort: ProgramSort;
}) {
  return (
    <form
      method="get"
      action={siteConfig.urls.programs}
      className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label htmlFor="program-search" className="text-sm font-medium text-foreground">
            Search
          </label>
          <input
            id="program-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Program name, administrator, or description"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="program-category" className="text-sm font-medium text-foreground">
            Category
          </label>
          <select
            id="program-category"
            name="category"
            defaultValue={category}
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
          <label htmlFor="program-benefit" className="text-sm font-medium text-foreground">
            Benefit type
          </label>
          <select
            id="program-benefit"
            name="benefit"
            defaultValue={benefitType}
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
          <label htmlFor="program-status" className="text-sm font-medium text-foreground">
            Status
          </label>
          <select
            id="program-status"
            name="status"
            defaultValue={status}
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
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="sm:w-64">
          <label htmlFor="program-sort" className="text-sm font-medium text-foreground">
            Sort
          </label>
          <select id="program-sort" name="sort" defaultValue={sort} className={fieldClass}>
            <option value="verified">Recently verified</option>
            <option value="value">Highest potential value</option>
            <option value="alpha">Alphabetical</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button type="submit">Apply filters</Button>
          <a
            href={siteConfig.urls.programs}
            className="inline-flex h-11 items-center justify-center rounded-lg px-5 text-base font-semibold text-foreground hover:bg-muted"
          >
            Clear
          </a>
        </div>
      </div>
    </form>
  );
}
