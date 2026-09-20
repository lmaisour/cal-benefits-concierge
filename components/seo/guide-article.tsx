import Link from "next/link";
import { TrackLink } from "@/components/analytics/track-link";
import { GuideBlocks } from "@/components/seo/guide-body";
import { ButtonLink } from "@/components/ui/button";
import { isCurrentlyAvailable } from "@/lib/content/currently-available";
import { siteConfig } from "@/lib/config/site";
import {
  consumerHeroSummary,
  parseGuideBody,
  type GuideLink,
  type GuideSection,
} from "@/lib/seo/guide-document";
import type { ProgramStatus } from "@/types/database";

export type GuideArticleProgram = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  status: ProgramStatus;
  active: boolean;
};

export function GuideArticle({
  title,
  excerpt,
  slug,
  body,
  relatedPrograms,
  breadcrumbParent,
  reviewBanner,
}: {
  title: string;
  excerpt: string | null;
  slug: string;
  body: string;
  relatedPrograms: GuideArticleProgram[];
  breadcrumbParent?: { href: string; label: string };
  reviewBanner?: string | null;
}) {
  const parsed = parseGuideBody(body);
  const summary = consumerHeroSummary(excerpt, parsed);
  const parent = breadcrumbParent ?? {
    href: siteConfig.urls.guides,
    label: "Guides",
  };
  const articleSections = parsed.sections.filter(
    (section) => section.heading !== "Related" && section.heading !== "Official source",
  );
  const relatedLinks = uniqueRelated(parsed.relatedLinks, relatedPrograms, slug);

  return (
    <article className="overflow-x-hidden pb-16">
      <div className="border-b border-border bg-hero">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link href={parent.href} className="rounded-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {parent.label}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-foreground" aria-current="page">
                {title}
              </li>
            </ol>
          </nav>
          {reviewBanner ? (
            <p className="mt-4 max-w-[47rem] rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground">
              {reviewBanner}
            </p>
          ) : null}
          <h1 className="mt-4 max-w-[47rem] font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          {summary ? (
            <p className="mt-4 max-w-[47rem] text-lg text-foreground">{summary}</p>
          ) : null}
          {parsed.officialCta ? (
            <div className="mt-6 lg:hidden">
              <ApplyButton cta={parsed.officialCta} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,47rem)_minmax(16rem,18rem)] lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-[47rem]">
          <CompactSummary
            benefit={parsed.benefitSummary}
            eligibility={parsed.eligibilityItems}
            className="mb-8 lg:hidden"
          />
          {articleSections.map((section, index) => (
            <GuideSectionBlock
              key={section.heading || "body"}
              section={section}
              isFirst={index === 0}
              warning={
                section.heading === "How to apply" ? parsed.approvalWarning : null
              }
              applyCta={
                section.heading === "How to apply" ? parsed.officialCta : null
              }
            />
          ))}

          <RelatedPrograms
            slug={slug}
            programs={relatedPrograms}
            extraLinks={relatedLinks}
          />

          <div className="mt-10">
            <ButtonLink href={siteConfig.urls.check}>Check what you qualify for</ButtonLink>
          </div>
          <p className="mt-8 text-sm text-muted-foreground">{siteConfig.disclaimer}</p>
        </div>

        <aside className="hidden min-w-0 lg:sticky lg:top-24 lg:block">
          <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
            {parsed.officialCta ? <ApplyButton cta={parsed.officialCta} /> : null}
            <CompactSummary
              benefit={parsed.benefitSummary}
              eligibility={parsed.eligibilityItems}
            />
            {parsed.officialSources.length > 0 ? (
              <div>
                <h2 className="font-serif text-lg font-semibold">Official sources</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {parsed.officialSources.map((source) => (
                    <li key={source.href}>
                      <a
                        href={source.href}
                        className="rounded-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </article>
  );
}

function GuideSectionBlock({
  section,
  isFirst,
  warning,
  applyCta,
}: {
  section: GuideSection;
  isFirst: boolean;
  warning: string | null;
  applyCta: GuideLink | null;
}) {
  const blocks =
    warning && section.heading === "How to apply"
      ? section.blocks.filter((block) => !(block.type === "paragraph" && block.text === warning))
      : section.blocks;
  return (
    <section className="min-w-0">
      {section.heading ? (
        <h2
          className={
            isFirst
              ? "mb-4 font-serif text-2xl font-semibold tracking-tight sm:text-3xl"
              : "mb-4 mt-10 border-t border-border pt-7 font-serif text-2xl font-semibold tracking-tight sm:text-3xl"
          }
        >
          {section.heading}
        </h2>
      ) : null}
      {warning ? (
        <aside
          role="note"
          className="mb-5 border-l-4 border-accent bg-hero px-4 py-3 text-base text-foreground"
        >
          <p className="font-semibold">Approval is required first</p>
          <p className="mt-1">{warning}</p>
        </aside>
      ) : null}
      <div className="text-base leading-7 text-foreground sm:text-lg sm:leading-8">
        <GuideBlocks blocks={blocks} />
      </div>
      {applyCta ? (
        <div className="mb-8 mt-2">
          <ApplyButton cta={applyCta} />
        </div>
      ) : null}
    </section>
  );
}

function CompactSummary({
  benefit,
  eligibility,
  className,
}: {
  benefit: string | null;
  eligibility: string[];
  className?: string;
}) {
  if (!benefit && eligibility.length === 0) {
    return null;
  }
  return (
    <section className={className} aria-label="At a glance">
      <h2 className="font-serif text-lg font-semibold">At a glance</h2>
      {benefit ? <p className="mt-2 text-sm leading-6 text-foreground sm:text-base">{benefit}</p> : null}
      {eligibility.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 marker:text-primary sm:text-base">
          {eligibility.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ApplyButton({ cta }: { cta: GuideLink }) {
  const external = /^https?:\/\//i.test(cta.href);
  return (
    <ButtonLink
      href={cta.href}
      size="lg"
      className="w-full"
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {cta.label}
    </ButtonLink>
  );
}

function RelatedPrograms({
  slug,
  programs,
  extraLinks,
}: {
  slug: string;
  programs: GuideArticleProgram[];
  extraLinks: GuideLink[];
}) {
  if (programs.length === 0 && extraLinks.length === 0) {
    return null;
  }
  return (
    <section className="mt-10">
      <h2 className="font-serif text-2xl font-semibold">Related programs</h2>
      {programs.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {programs.map((program) => (
            <li key={program.id} className="rounded-2xl border border-border bg-card p-4">
              <TrackLink
                href={`${siteConfig.urls.programs}/${program.slug}`}
                event="guide_program_clicked"
                eventProps={{ guide_slug: slug, program_slug: program.slug }}
                className="rounded-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {program.name}
              </TrackLink>
              {program.short_description ? (
                <p className="mt-1 text-sm text-muted-foreground">{program.short_description}</p>
              ) : null}
              {!isCurrentlyAvailable(program) ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Not currently available ({program.status}).
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {extraLinks.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {extraLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="rounded-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function uniqueRelated(
  links: GuideLink[],
  programs: GuideArticleProgram[],
  slug: string,
): GuideLink[] {
  const programHrefs = new Set(
    programs.map((program) => `${siteConfig.urls.programs}/${program.slug}`),
  );
  return links.filter((link) => {
    if (link.href === `${siteConfig.urls.guides}/${slug}`) {
      return false;
    }
    if (programHrefs.has(link.href)) {
      return false;
    }
    if (link.href === siteConfig.urls.check) {
      return false;
    }
    return true;
  });
}
