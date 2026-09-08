import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProgramDetailView } from "@/components/programs/program-detail";
import { editorialMetaDescription, editorialSeoTitle } from "@/lib/content/editorial";
import { siteConfig } from "@/lib/config/site";
import { getProgramBySlug } from "@/lib/programs/get-program-by-slug";
import { absoluteUrl } from "@/lib/seo/site-url";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const detail = await getProgramBySlug(slug);
    if (!detail) {
      return { title: "Program not found" };
    }
    const title = editorialSeoTitle(detail.program, detail.content);
    const description = editorialMetaDescription(detail.program, detail.content);
    const path = `${siteConfig.urls.programs}/${detail.program.slug}`;
    return {
      title,
      description,
      alternates: {
        canonical: path,
      },
      openGraph: {
        title,
        description,
        url: absoluteUrl(path),
        type: "website",
        siteName: siteConfig.name,
      },
    };
  } catch {
    return { title: "Program details" };
  }
}

export default async function ProgramDetailPage({ params }: PageProps) {
  const { slug } = await params;
  let detail;
  try {
    detail = await getProgramBySlug(slug);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load this program.";
    return (
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
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

  const title = editorialSeoTitle(detail.program, detail.content);
  const description = editorialMetaDescription(detail.program, detail.content);
  return (
    <ProgramDetailView
      detail={detail}
      seoTitle={title}
      seoDescription={description}
    />
  );
}
