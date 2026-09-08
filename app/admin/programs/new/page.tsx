import type { Metadata } from "next";
import { ProgramForm } from "@/components/admin/program-form";
import { requireAdminSession } from "@/lib/admin/auth";
import { emptyProgramFormValues } from "@/lib/admin/validate-program";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Add program",
};

export default async function NewProgramPage() {
  await requireAdminSession();

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-3xl font-semibold">Add program</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Creates a catalog record. Leave inactive until it is ready for the public directory.
      </p>
      <div className="mt-8">
        <ProgramForm mode="create" initialValues={emptyProgramFormValues()} />
      </div>
    </section>
  );
}
