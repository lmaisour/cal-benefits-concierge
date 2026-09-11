import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackLink } from "@/components/analytics/track-link";
import { TrackView } from "@/components/analytics/track-view";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { ButtonLink } from "@/components/ui/button";
import { isCurrentlyAvailable } from "@/lib/content/currently-available";
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
    <article className="pb-16">
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
      <div className="border-b border-border bg-hero">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link href={siteConfig.urls.guides} className="font-semibold text-primary hover:underline">
                  Guides
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-foreground" aria-current="page">
                {guide.title}
              </li>
            </ol>
          </nav>
          <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            {guide.title}
          </h1>
          {guide.excerpt ? (
            <p className="mt-4 text-lg text-muted-foreground">{guide.excerpt}</p>
          ) : null}
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {guide.body.trim() ? (
          <div className="whitespace-pre-line leading-relaxed text-foreground">{guide.body}</div>
        ) : null}

        {relatedPrograms.length > 0 ? (
          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold">Related programs</h2>
            <ul className="mt-4 space-y-3">
              {relatedPrograms.map((program) => (
                <li key={program.id} className="rounded-2xl border border-border bg-card p-4">
                  <TrackLink
                    href={`${siteConfig.urls.programs}/${program.slug}`}
                    event="guide_program_clicked"
                    eventProps={{ guide_slug: guide.slug, program_slug: program.slug }}
                    className="font-semibold text-primary hover:underline"
                  >
                    {program.name}
                  </TrackLink>
                  {program.short_description ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {program.short_description}
                    </p>
                  ) : null}
                  {!isCurrentlyAvailable(program) ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Not currently available ({program.status}).
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-10">
          <ButtonLink href={siteConfig.urls.check}>Check what you qualify for</ButtonLink>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">{siteConfig.disclaimer}</p>
      </div>
    </article>
  );
}
