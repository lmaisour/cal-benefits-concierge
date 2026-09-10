import type { Metadata } from "next";
import Link from "next/link";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { siteConfig } from "@/lib/config/site";
import { listPublishedGuides } from "@/lib/guides/public-queries";
import { breadcrumbJsonLd, webPageJsonLd } from "@/lib/seo/json-ld";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Guides",
  description:
    "Practical guides to California benefit programs. Only published articles appear here.",
  alternates: { canonical: "/guides" },
  openGraph: {
    title: "Guides",
    description:
      "Practical guides to California benefit programs. Only published articles appear here.",
    url: "/guides",
    type: "website",
    siteName: siteConfig.name,
  },
};

export default async function GuidesIndexPage() {
  let guides: Awaited<ReturnType<typeof listPublishedGuides>> = [];
  let loadError: string | null = null;
  if (isSupabaseConfigured()) {
    try {
      guides = await listPublishedGuides();
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Could not load guides.";
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <JsonLdScript
        data={[
          webPageJsonLd({
            name: "Guides",
            description: "Practical guides to California benefit programs.",
            path: siteConfig.urls.guides,
          }),
          breadcrumbJsonLd([
            { name: "Home", path: siteConfig.urls.home },
            { name: "Guides", path: siteConfig.urls.guides },
          ]),
        ]}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href={siteConfig.urls.home} className="font-semibold text-primary hover:underline">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground" aria-current="page">
            Guides
          </li>
        </ol>
      </nav>
      <h1 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">Guides</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Short explainers about California programs. We publish only reviewed
        articles.
      </p>
      {loadError ? (
        <p className="mt-8 rounded-2xl border border-border bg-card p-6" role="alert">
          {loadError}
        </p>
      ) : guides.length === 0 ? (
        <p className="mt-8 text-muted-foreground">No published guides yet.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {guides.map((guide) => (
            <li key={guide.id} className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-serif text-xl font-semibold">
                <Link
                  href={`${siteConfig.urls.guides}/${guide.slug}`}
                  className="text-primary hover:underline"
                >
                  {guide.title}
                </Link>
              </h2>
              {guide.excerpt ? (
                <p className="mt-2 text-muted-foreground">{guide.excerpt}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
