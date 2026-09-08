import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  filterAdminPrograms,
  parseAdminProgramListQuery,
} from "@/lib/admin/filter-programs";
import { formatAdminDate, reviewLabel } from "@/lib/admin/form-values";
import { listAllPrograms } from "@/lib/admin/queries";
import { ButtonLink } from "@/components/ui/button";
import { programCategories } from "@/lib/config/categories";
import { formatCategory, formatProgramValue } from "@/lib/programs/format";
import {
  CONFIDENCE_LABELS,
  STATUS_LABELS,
} from "@/lib/programs/labels";
import {
  CONFIDENCE_LEVELS,
  PROGRAM_STATUSES,
} from "@/types/database";
import type { Program } from "@/types/program";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin programs",
};

export default async function AdminProgramsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();
  const query = parseAdminProgramListQuery(await searchParams);

  let programs: Program[] = [];
  let loadError: string | null = null;
  try {
    programs = await listAllPrograms();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load programs.";
  }

  const filtered = filterAdminPrograms(programs, query);
  const categories = Array.from(
    new Set([
      ...programCategories.map((item) => item.slug),
      ...programs.map((program) => program.category),
    ]),
  ).sort();

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Programs</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {filtered.length} of {programs.length} records
          </p>
        </div>
        <ButtonLink href="/admin/programs/new" size="sm">
          Add program
        </ButtonLink>
      </div>

      <form method="get" className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm font-medium">
          Search
          <input
            name="q"
            defaultValue={query.q}
            placeholder="Name or administrator"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium">
          Status
          <select
            name="status"
            defaultValue={query.status}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">Any</option>
            {PROGRAM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Category
          <select
            name="category"
            defaultValue={query.category}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">Any</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {formatCategory(category)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Confidence
          <select
            name="confidence"
            defaultValue={query.confidence}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">Any</option>
            {CONFIDENCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {CONFIDENCE_LABELS[level]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm font-medium">
          <input
            type="checkbox"
            name="review"
            value="1"
            defaultChecked={query.needsReview}
          />
          Needs review
        </label>
        <div className="lg:col-span-5">
          <button
            type="submit"
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          >
            Apply filters
          </button>
        </div>
      </form>

      {loadError ? (
        <p className="mt-6 rounded-lg border border-border bg-muted px-4 py-3 text-sm" role="alert">
          {loadError}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Administrator</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Benefit</th>
                <th className="px-3 py-3">Verified</th>
                <th className="px-3 py-3">Confidence</th>
                <th className="px-3 py-3"> </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((program) => {
                const value = formatProgramValue(program);
                const review = reviewLabel(program);
                return (
                  <tr key={program.id} className="border-t border-border align-top">
                    <td className="px-3 py-3">
                      <div className="font-medium">{program.name}</div>
                      {review ? (
                        <div className="text-xs text-accent">{review}</div>
                      ) : null}
                      {program.active ? null : (
                        <div className="text-xs text-muted-foreground">Inactive</div>
                      )}
                    </td>
                    <td className="px-3 py-3">{program.administrator ?? "—"}</td>
                    <td className="px-3 py-3">{STATUS_LABELS[program.status]}</td>
                    <td className="px-3 py-3">{formatCategory(program.category)}</td>
                    <td className="px-3 py-3">
                      {program.benefit_summary || value.text || "—"}
                    </td>
                    <td className="px-3 py-3">
                      {formatAdminDate(program.last_verified_at)}
                    </td>
                    <td className="px-3 py-3">
                      {program.confidence
                        ? CONFIDENCE_LABELS[program.confidence]
                        : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/programs/${program.id}`}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-muted-foreground" colSpan={8}>
                    No programs match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
