import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin/auth";
import { countByStatus } from "@/lib/admin/filter-programs";
import { countProgramsNeedingReview } from "@/lib/admin/needs-review";
import { listAllPrograms } from "@/lib/admin/queries";
import { ButtonLink } from "@/components/ui/button";
import { STATUS_LABELS } from "@/lib/programs/labels";
import { PROGRAM_STATUSES } from "@/types/database";
import type { Program } from "@/types/program";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin dashboard",
};

export default async function AdminDashboardPage() {
  await requireAdminSession();

  let programs: Program[] = [];
  let loadError: string | null = null;
  try {
    programs = await listAllPrograms();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load programs.";
  }

  const statusCounts = countByStatus(programs);
  const needsReview = countProgramsNeedingReview(programs);

  const cards = [
    { label: "Total programs", value: programs.length, href: "/admin/programs" },
    ...PROGRAM_STATUSES.map((status) => ({
      label: STATUS_LABELS[status],
      value: statusCounts[status],
      href: `/admin/programs?status=${status}`,
    })),
    {
      label: "Needs review",
      value: needsReview,
      href: "/admin/programs?review=1",
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Program admin</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Maintain catalog records. Consumer matching and geography are unchanged.
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/admin/programs" variant="secondary" size="sm">
            All programs
          </ButtonLink>
          <ButtonLink href="/admin/programs/new" size="sm">
            Add program
          </ButtonLink>
        </div>
      </div>

      {loadError ? (
        <p className="mt-6 rounded-lg border border-border bg-muted px-4 py-3 text-sm" role="alert">
          {loadError}
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((card) => (
            <li key={card.label}>
              <Link
                href={card.href}
                className="block rounded-2xl border border-border bg-card p-4 hover:bg-muted"
              >
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-2 font-serif text-3xl font-semibold">{card.value}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
