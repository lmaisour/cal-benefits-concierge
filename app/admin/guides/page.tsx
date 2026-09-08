import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin/auth";
import { formatAdminDate } from "@/lib/admin/form-values";
import { listAllGuides } from "@/lib/admin/guide-queries";
import { ButtonLink } from "@/components/ui/button";
import type { Guide } from "@/types/program";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin guides",
};

export default async function AdminGuidesPage() {
  await requireAdminSession();

  let guides: Guide[] = [];
  let loadError: string | null = null;
  try {
    guides = await listAllGuides();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load guides.";
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Guides</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {guides.length} guide{guides.length === 1 ? "" : "s"}. Unpublished
            drafts stay off the public site.
          </p>
        </div>
        <ButtonLink href="/admin/guides/new" size="sm">
          Add guide
        </ButtonLink>
      </div>

      {loadError ? (
        <p className="mt-6 rounded-lg border border-border bg-muted px-4 py-3 text-sm" role="alert">
          {loadError}
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Published</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {guides.map((guide) => (
                <tr key={guide.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/guides/${guide.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {guide.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{guide.slug}</td>
                  <td className="px-4 py-3">
                    {guide.published ? "Published" : "Draft"}
                  </td>
                  <td className="px-4 py-3">{formatAdminDate(guide.published_at)}</td>
                  <td className="px-4 py-3">{formatAdminDate(guide.updated_at)}</td>
                </tr>
              ))}
              {guides.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-muted-foreground">
                    No guides yet.
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
