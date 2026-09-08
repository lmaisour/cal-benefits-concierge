import Link from "next/link";
import { logoutAction } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/programs", label: "Programs" },
  { href: "/admin/programs/new", label: "Add program" },
  { href: "/admin/guides", label: "Guides" },
  { href: "/admin/homepage", label: "Homepage" },
];

export function AdminNav() {
  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div>
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            Internal admin
          </p>
          <nav aria-label="Admin" className="mt-1 flex flex-wrap gap-2 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-2 py-1 font-medium text-foreground hover:bg-muted"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="secondary" size="sm">
            Log out
          </Button>
        </form>
      </div>
    </div>
  );
}
