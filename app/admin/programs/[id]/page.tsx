import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FaqEditor } from "@/components/admin/faq-editor";
import { ContentBriefForm } from "@/components/admin/content-brief-form";
import { ContentEvidenceEditor } from "@/components/admin/content-evidence-editor";
import { HomepageFeatureForm } from "@/components/admin/homepage-feature-form";
import { ProgramContentForm } from "@/components/admin/program-content-form";
import { ProgramForm } from "@/components/admin/program-form";
import { FollowupRecords } from "@/components/admin/followup-records";
import { RelatedRecords } from "@/components/admin/related-records";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  contentBriefToFormValues,
  contentToFormValues,
  programToFormValues,
} from "@/lib/admin/form-values";
import { getAdminProgramById } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const detail = await getAdminProgramById(id);
    if (!detail) {
      return { title: "Program not found" };
    }
    return { title: `Edit ${detail.program.name}` };
  } catch {
    return { title: "Edit program" };
  }
}

export default async function EditProgramPage({ params }: PageProps) {
  await requireAdminSession();
  const { id } = await params;

  let detail;
  try {
    detail = await getAdminProgramById(id);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load this program.";
    return (
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-6" role="alert">
          <h1 className="font-serif text-2xl font-semibold">Program could not be loaded</h1>
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
      <h1 className="font-serif text-3xl font-semibold">Edit program</h1>
      <p className="mt-2 text-sm text-muted-foreground">{detail.program.name}</p>
      <div className="mt-8">
        <ProgramForm
          mode="edit"
          programId={detail.program.id}
          initialValues={programToFormValues(detail.program)}
          readOnly={{
            externalId: detail.program.external_id,
            unmodeledSummary: detail.program.unmodeled_required_criteria_summary,
          }}
        />
      </div>
      <div className="mt-12 border-t border-border pt-10">
        <HomepageFeatureForm
          programId={detail.program.id}
          status={detail.program.status}
          active={detail.program.active}
          feature={detail.homepageFeature}
        />
      </div>
      <div className="mt-12 border-t border-border pt-10">
        <ProgramContentForm
          programId={detail.program.id}
          programSlug={detail.program.slug}
          initialValues={contentToFormValues(detail.content)}
        />
      </div>
      <div className="mt-12 border-t border-border pt-10">
        <FaqEditor
          programId={detail.program.id}
          programSlug={detail.program.slug}
          faqs={detail.faqs}
        />
      </div>
      <div className="mt-12 border-t border-border pt-10">
        <ContentBriefForm
          owner="program"
          ownerId={detail.program.id}
          initialValues={contentBriefToFormValues(detail.contentBrief)}
        />
      </div>
      <div className="mt-12 border-t border-border pt-10">
        <ContentEvidenceEditor programId={detail.program.id} evidence={detail.evidence} />
      </div>
      <div className="mt-12 border-t border-border pt-10">
        <FollowupRecords
          programId={detail.program.id}
          questions={detail.followupQuestions}
          rules={detail.followupRules}
        />
      </div>
      <div className="mt-12 border-t border-border pt-10">
        <RelatedRecords
          programId={detail.program.id}
          rules={detail.rules}
          locations={detail.locations}
          sources={detail.sources}
          related={detail.related}
        />
      </div>
    </section>
  );
}
