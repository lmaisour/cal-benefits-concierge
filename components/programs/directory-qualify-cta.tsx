import { ButtonLink } from "@/components/ui/button";
import { siteConfig } from "@/lib/config/site";

export function DirectoryQualifyCta({ quiet = false }: { quiet?: boolean }) {
  return (
    <aside
      className={
        quiet
          ? "mt-6 flex flex-col gap-2 rounded-xl border border-dashed border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          : "mt-6 flex flex-col gap-3 rounded-2xl border border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
      }
    >
      <div className="max-w-xl">
        <p className={quiet ? "text-sm font-medium text-foreground" : "font-semibold text-foreground"}>
          Want us to narrow it down further?
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Answer a few questions about your household and we&apos;ll check which
          programs may fit.
        </p>
      </div>
      <ButtonLink
        href={siteConfig.urls.check}
        variant={quiet ? "secondary" : "primary"}
        size={quiet ? "sm" : "md"}
        className="w-full shrink-0 sm:w-auto"
      >
        Check what I qualify for
      </ButtonLink>
    </aside>
  );
}
