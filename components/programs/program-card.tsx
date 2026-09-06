import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { formatCategory, formatDate, formatProgramValue } from "@/lib/programs/format";
import { benefitTypeLabel, statusLabel } from "@/lib/programs/labels";
import { siteConfig } from "@/lib/config/site";
import type { Program } from "@/types/program";

export function ProgramCard({ program }: { program: Program }) {
  const value = formatProgramValue(program);
  const verified = formatDate(program.last_verified_at);

  return (
    <Card className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{statusLabel(program.status)}</Badge>
        <Badge>{formatCategory(program.category)}</Badge>
        <Badge>{benefitTypeLabel(program.benefit_type)}</Badge>
        {program.statewide ? <Badge>Statewide</Badge> : null}
      </div>
      <CardTitle className="mt-4">
        <Link
          href={`${siteConfig.urls.programs}/${program.slug}`}
          className="hover:underline"
        >
          {program.name}
        </Link>
      </CardTitle>
      {program.administrator ? (
        <p className="mt-1 text-sm text-muted-foreground">{program.administrator}</p>
      ) : null}
      {program.short_description ? (
        <CardDescription className="mt-3">{program.short_description}</CardDescription>
      ) : null}
      {program.benefit_summary ? (
        <p className="mt-3 text-sm text-foreground">{program.benefit_summary}</p>
      ) : null}
      {value.kind === "savings" ? (
        <p className="mt-3 text-base font-semibold text-foreground">{value.text}</p>
      ) : null}
      {value.kind === "financing" ? (
        <p className="mt-3 text-sm font-semibold text-foreground">
          {value.text}. This is repayable and is not free savings.
        </p>
      ) : null}
      <p className="mt-auto pt-4 text-xs text-muted-foreground">
        {verified ? `Last verified ${verified}` : "Verification date not recorded"}
      </p>
      <Link
        href={`${siteConfig.urls.programs}/${program.slug}`}
        className="mt-3 text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        View details
      </Link>
    </Card>
  );
}
