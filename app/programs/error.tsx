"use client";

import { ButtonLink } from "@/components/ui/button";
import { siteConfig } from "@/lib/config/site";

export default function ProgramsError() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-serif text-3xl font-semibold text-foreground">
        Programs could not be loaded
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        The program directory is unavailable right now.
      </p>
      <div className="mt-8">
        <ButtonLink href={siteConfig.urls.programs} variant="secondary">
          Try again
        </ButtonLink>
      </div>
    </section>
  );
}
