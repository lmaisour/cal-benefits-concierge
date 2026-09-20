import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideArticle } from "@/components/seo/guide-article";
import { isPreviewReviewEnabled } from "@/lib/guides/preview-access";
import { getPreviewGuideFixture } from "@/lib/guides/preview-fixtures";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (!isPreviewReviewEnabled()) {
    notFound();
  }
  const { slug } = await params;
  const fixture = getPreviewGuideFixture(slug);
  if (!fixture) {
    notFound();
  }
  return {
    title: `${fixture.seo_title} (Preview review)`,
    description: fixture.meta_description,
    robots: { index: false, follow: false, nocache: true },
    openGraph: {
      title: fixture.title,
      description: fixture.meta_description,
      type: "article",
    },
  };
}

export default async function PreviewGuidePage({ params }: PageProps) {
  if (!isPreviewReviewEnabled()) {
    notFound();
  }
  const { slug } = await params;
  const fixture = getPreviewGuideFixture(slug);
  if (!fixture) {
    notFound();
  }

  return (
    <GuideArticle
      title={fixture.title}
      excerpt={fixture.excerpt}
      slug={fixture.slug}
      body={fixture.body}
      relatedPrograms={fixture.relatedPrograms}
      breadcrumbParent={{ href: "/guides", label: "Guides" }}
      reviewBanner="Preview-only review example. This page is not indexed and is not a published Production article."
    />
  );
}
