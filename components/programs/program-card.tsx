import Link from "next/link";
import { LocationCoverage } from "@/components/programs/location-coverage";
import { StatusBadge } from "@/components/programs/status-badge";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCategory, formatDate, formatProgramValue } from "@/lib/programs/format";
import { siteConfig } from "@/lib/config/site";
import { REPAYABLE_NOTICE } from "@/lib/eligibility/consumer-match";
import type { Program, ProgramLocation } from "@/types/program";

function truncateDescription(text: string, max = 150): string {
  if (text.length <= max) {
    return text;
  }
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : max).trim()}…`;
}

export function ProgramCard({
  program,
  locations = [],
}: {
  program: Program;
  locations?: ProgramLocation[];
}) {
  const value = formatProgramValue(program);
  const verified = formatDate(program.last_verified_at);
  const href = `${siteConfig.urls.programs}/${program.slug}`;
  const description = program.short_description
    ? truncateDescription(program.short_description)
    : null;

  return (
    <Card className="flex h-full flex-col gap-4 p-6 transition-shadow hover:shadow-[0_2px_6px_rgba(28,25,23,0.06),0_14px_28px_rgba(28,25,23,0.06)]">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{formatCategory(program.category)}</Badge>
        <StatusBadge status={program.status} />
      </div>

      <div>
        <h2 className="font-serif text-xl font-semibold tracking-tight text-foreground">
          <Link
            href={href}
            className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {program.name}
          </Link>
        </h2>
        {program.administrator ? (
          <p className="mt-1 text-sm text-muted-foreground">{program.administrator}</p>
        ) : null}
      </div>

      {description ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}

      {value.kind === "savings" ? (
        <p className="text-lg font-semibold text-foreground">{value.text}</p>
      ) : null}
      {value.kind === "financing" ? (
        <div>
          <p className="text-lg font-semibold text-foreground">{value.text}</p>
          <p className="mt-1 text-sm font-medium text-muted-foreground">{REPAYABLE_NOTICE}</p>
        </div>
      ) : null}
      {value.kind === "none" && program.benefit_summary ? (
        <p className="text-base font-semibold text-foreground">{program.benefit_summary}</p>
      ) : null}

      <LocationCoverage
        statewide={program.statewide}
        locations={locations}
        compact
      />

      <p className="mt-auto text-xs text-muted-foreground">
        {verified ? `Last verified ${verified}` : "Verification date not recorded"}
      </p>

      <ButtonLink href={href} variant="secondary" size="sm" className="w-full sm:w-auto">
        View program
      </ButtonLink>
    </Card>
  );
}
