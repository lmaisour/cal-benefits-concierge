import type { Metadata } from "next";
import { GuideForm } from "@/components/admin/guide-form";
import { requireAdminSession } from "@/lib/admin/auth";
import { listProgramOptions } from "@/lib/admin/guide-queries";
import { emptyGuideFormValues } from "@/lib/admin/validate-guide";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New guide",
};

export default async function NewGuidePage() {
  await requireAdminSession();
  let programOptions: Awaited<ReturnType<typeof listProgramOptions>> = [];
  let loadError: string | null = null;
  try {
    programOptions = await listProgramOptions();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load programs.";
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-3xl font-semibold">New guide</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Drafts stay unpublished until you check Published.
      </p>
      {loadError ? (
        <p className="mt-6 rounded-lg border border-border bg-muted px-4 py-3 text-sm" role="alert">
          {loadError}
        </p>
      ) : (
        <div className="mt-8">
          <GuideForm mode="create" initialValues={emptyGuideFormValues()} programOptions={programOptions} />
        </div>
      )}
    </section>
  );
}
