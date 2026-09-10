import {
  Car,
  Droplets,
  Home,
  Landmark,
  Receipt,
  Sprout,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { TrackButtonLink } from "@/components/analytics/track-link";
import { ProgramCard } from "@/components/programs/program-card";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { programCategories } from "@/lib/config/categories";
import { siteConfig } from "@/lib/config/site";
import type { Program } from "@/types/program";

const categoryIcons: Record<string, LucideIcon> = {
  vehicles: Car,
  "home-energy": Home,
  utilities: Zap,
  housing: Landmark,
  water: Droplets,
  family: Users,
  taxes: Receipt,
  other: Sprout,
};

export function HomePage({ featuredPrograms }: { featuredPrograms: Program[] }) {
  return (
    <>
      <section className="border-b border-border bg-hero">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:py-24">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">
            For California residents
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
            {siteConfig.hero.headline}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {siteConfig.hero.subheadline}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <TrackButtonLink
              href={siteConfig.urls.check}
              size="lg"
              event="homepage_check_clicked"
            >
              {siteConfig.hero.primaryCta}
            </TrackButtonLink>
            <TrackButtonLink
              href={siteConfig.urls.programs}
              variant="secondary"
              size="lg"
              event="browse_programs_clicked"
            >
              {siteConfig.hero.secondaryCta}
            </TrackButtonLink>
          </div>
          <p className="mt-8 max-w-xl text-sm text-muted-foreground">
            {siteConfig.trustStatement}
          </p>
        </div>
      </section>

      {featuredPrograms.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">
            {siteConfig.featured.heading}
          </h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            {siteConfig.featured.supporting}
          </p>
          <ul className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {featuredPrograms.map((program) => (
              <li key={program.id}>
                <ProgramCard
                  program={program}
                  trackEvent="featured_program_clicked"
                  trackProps={{ program_slug: program.slug }}
                />
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <TrackButtonLink
              href={siteConfig.urls.check}
              event="homepage_check_clicked"
            >
              {siteConfig.hero.primaryCta}
            </TrackButtonLink>
            <TrackButtonLink
              href={siteConfig.urls.programs}
              variant="secondary"
              event="browse_programs_clicked"
            >
              {siteConfig.hero.secondaryCta}
            </TrackButtonLink>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">
          Programs across California
        </h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Browse by category, or answer a few questions to see which programs
          may apply to your household.
        </p>
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {programCategories.map((category) => {
            const Icon = categoryIcons[category.slug] ?? Sprout;
            return (
              <li key={category.slug}>
                <Link
                  href={`${siteConfig.urls.programs}?category=${category.slug}`}
                  className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="h-full">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-primary">
                      <Icon aria-hidden className="h-5 w-5" />
                    </div>
                    <CardTitle className="mt-4">{category.label}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
