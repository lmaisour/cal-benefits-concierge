import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentBriefForm } from "@/components/admin/content-brief-form";
import { GuideForm } from "@/components/admin/guide-form";
import { requireAdminSession } from "@/lib/admin/auth";
import { contentBriefToFormValues, guideToFormValues } from "@/lib/admin/form-values";
import { getAdminGuideById, listProgramOptions } from "@/lib/admin/guide-queries";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const detail = await getAdminGuideById(id);
    if (!detail) {
      return { title: "Guide not found" };
    }
    return { title: `Edit ${detail.guide.title}` };
  } catch {
    return { title: "Edit guide" };
  }
}

export default async function EditGuidePage({ params }: PageProps) {
  await requireAdminSession();
  const { id } = await params;

  let detail;
  let programOptions;
  try {
    [detail, programOptions] = await Promise.all([
      getAdminGuideById(id),
      listProgramOptions(),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load this guide.";
    return (
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-6" role="alert">
          <h1 className="font-serif text-2xl font-semibold">Guide could not be loaded</h1>
          <p className="mt-3 text-muted-foreground">{message}</p>
        </div>
      </section>
    );
  }

  if (!detail) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-3xl font-semibold">Edit guide</h1>
      <p className="mt-2 text-sm text-muted-foreground">{detail.guide.title}</p>
      <div className="mt-8">
        <GuideForm
          mode="edit"
          guideId={detail.guide.id}
          initialValues={guideToFormValues(
            detail.guide,
            detail.relatedPrograms.map((program) => program.id),
          )}
          programOptions={programOptions}
        />
      </div>
      <div className="mt-12 border-t border-border pt-10">
        <ContentBriefForm
          owner="guide"
          ownerId={detail.guide.id}
          initialValues={contentBriefToFormValues(detail.contentBrief)}
        />
      </div>
    </section>
  );
}
