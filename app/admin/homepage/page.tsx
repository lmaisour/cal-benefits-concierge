import type { Metadata } from "next";
import { HomepageFeatureManager } from "@/components/admin/homepage-feature-manager";
import { requireAdminSession } from "@/lib/admin/auth";
import { listProgramOptions } from "@/lib/admin/guide-queries";
import { listHomepageFeatures } from "@/lib/admin/homepage-queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Homepage featured programs",
};

export default async function AdminHomepagePage() {
  await requireAdminSession();

  let features;
  let programOptions;
  let loadError: string | null = null;
  try {
    [features, programOptions] = await Promise.all([
      listHomepageFeatures(),
      listProgramOptions(),
    ]);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load homepage features.";
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-3xl font-semibold">Homepage featured programs</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Choose which catalog programs appear on the homepage and in what order.
        Cards always use live program facts. Only ACTIVE, currently available
        programs are shown to visitors.
      </p>
      {loadError ? (
        <p className="mt-6 rounded-lg border border-border bg-muted px-4 py-3 text-sm" role="alert">
          {loadError}
        </p>
      ) : (
        <div className="mt-8">
          <HomepageFeatureManager
            features={features ?? []}
            programOptions={programOptions ?? []}
          />
        </div>
      )}
    </section>
  );
}
