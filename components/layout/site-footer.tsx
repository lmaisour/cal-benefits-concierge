import Link from "next/link";
import { siteConfig } from "@/lib/config/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="max-w-md">
          <p className="font-serif text-base font-semibold text-foreground">
            {siteConfig.name}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{siteConfig.tagline}</p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2 text-sm">
          <Link
            href={siteConfig.urls.check}
            className="text-muted-foreground hover:text-foreground"
          >
            {siteConfig.hero.primaryCta}
          </Link>
          <Link
            href={siteConfig.urls.programs}
            className="text-muted-foreground hover:text-foreground"
          >
            {siteConfig.hero.secondaryCta}
          </Link>
        </nav>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs leading-relaxed text-muted-foreground sm:px-6">
          {siteConfig.disclaimer}
        </p>
      </div>
    </footer>
  );
}
