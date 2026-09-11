"use client";

import { ButtonLink } from "@/components/ui/button";
import { siteConfig } from "@/lib/config/site";

export default function GuidesError() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-serif text-3xl font-semibold text-foreground">
        Guides could not be loaded
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        This page is unavailable right now. Please try again in a moment.
      </p>
      <div className="mt-8">
        <ButtonLink href={siteConfig.urls.guides} variant="secondary">
          Browse guides
        </ButtonLink>
      </div>
    </section>
  );
}
