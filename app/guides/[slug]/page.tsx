import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackView } from "@/components/analytics/track-view";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { GuideArticle } from "@/components/seo/guide-article";
import { siteConfig } from "@/lib/config/site";
import { getPublishedGuideBySlug } from "@/lib/guides/public-queries";
import { breadcrumbJsonLd, webPageJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site-url";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getPublishedGuideBySlug(slug);
  if (!detail) {
    notFound();
  }
  const title = detail.guide.seo_title ?? detail.guide.title;
  const description =
    detail.guide.meta_description ??
    detail.guide.excerpt ??
    siteConfig.description;
  const path = `${siteConfig.urls.guides}/${detail.guide.slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      type: "article",
      siteName: siteConfig.name,
    },
  };
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const detail = await getPublishedGuideBySlug(slug);

  if (!detail) {
    notFound();
  }

  const { guide, relatedPrograms } = detail;
  const path = `${siteConfig.urls.guides}/${guide.slug}`;
  const description =
    guide.meta_description ?? guide.excerpt ?? siteConfig.description;

  return (
    <>
      <TrackView event="guide_viewed" props={{ guide_slug: guide.slug }} />
      <JsonLdScript
        data={[
          webPageJsonLd({
            name: guide.seo_title ?? guide.title,
            description,
            path,
          }),
          breadcrumbJsonLd([
            { name: "Home", path: siteConfig.urls.home },
            { name: "Guides", path: siteConfig.urls.guides },
            { name: guide.title, path },
          ]),
        ]}
      />
      <GuideArticle
        title={guide.title}
        excerpt={guide.excerpt}
        slug={guide.slug}
        body={guide.body}
        relatedPrograms={relatedPrograms}
      />
    </>
  );
}
