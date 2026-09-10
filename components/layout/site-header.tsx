import Link from "next/link";
import { siteConfig } from "@/lib/config/site";

const navItems = [
  { href: siteConfig.urls.check, label: "Check benefits" },
  { href: siteConfig.urls.programs, label: "Browse programs" },
  { href: siteConfig.urls.guides, label: "Guides" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href={siteConfig.urls.home}
          className="min-w-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="block truncate font-serif text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {siteConfig.name}
          </span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
