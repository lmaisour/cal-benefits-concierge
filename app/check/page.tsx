import { ButtonLink } from "@/components/ui/button";
import { siteConfig } from "@/lib/config/site";

export default function CheckPlaceholderPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-serif text-3xl font-semibold text-foreground">
        Check my benefits
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        The eligibility questionnaire is not available yet. This page is a
        placeholder while the matching engine is built.
      </p>
      <div className="mt-8">
        <ButtonLink href={siteConfig.urls.home} variant="secondary">
          Back to homepage
        </ButtonLink>
      </div>
    </section>
  );
}
