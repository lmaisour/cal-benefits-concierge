import { ButtonLink } from "@/components/ui/button";
import { siteConfig } from "@/lib/config/site";

export default function ProgramsPlaceholderPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-serif text-3xl font-semibold text-foreground">
        Browse all programs
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        The program directory is not available yet. This page is a placeholder
        until program data is connected in a later milestone.
      </p>
      <div className="mt-8">
        <ButtonLink href={siteConfig.urls.home} variant="secondary">
          Back to homepage
        </ButtonLink>
      </div>
    </section>
  );
}
