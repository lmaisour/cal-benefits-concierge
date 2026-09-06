import Link from "next/link";
import { siteConfig } from "@/lib/config/site";

export default function ProgramNotFound() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-serif text-3xl font-semibold text-foreground">
        Program not found
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        That program is not in the public directory. It may be expired, inactive,
        or the link may be incorrect.
      </p>
      <p className="mt-6">
        <Link
          href={siteConfig.urls.programs}
          className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Browse all programs
        </Link>
      </p>
    </section>
  );
}
