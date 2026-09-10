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
  const detail = await getProgramBySlug(slug);
  if (!detail) {
    notFound();
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
}

export default async function ProgramDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const detail = await getProgramBySlug(slug);

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
