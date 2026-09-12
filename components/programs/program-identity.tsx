import type { ReactNode } from "react";
import { AudienceTags } from "@/components/programs/audience-tags";
import {
  programPresentation,
  type ProgramPresentationSource,
} from "@/lib/programs/presentation";
import { cn } from "@/lib/utils/cn";

export function ProgramIdentity({
  program,
  headingLevel,
  title,
  className,
}: {
  program: ProgramPresentationSource;
  headingLevel: 1 | 2 | 3;
  title?: ReactNode;
  className?: string;
}) {
  const display = programPresentation(program);
  const Heading = (`h${headingLevel}` as "h1" | "h2" | "h3");
  const headingClass =
    headingLevel === 1
      ? "font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
      : "font-serif text-xl font-semibold tracking-tight text-foreground";
  const officialClass =
    headingLevel === 1
      ? "mt-2 text-lg font-medium text-foreground"
      : "mt-1 text-sm font-medium text-foreground";

  return (
    <div className={cn(className)}>
      <Heading className={headingClass}>{title ?? display.primaryTitle}</Heading>
      {display.showOfficialSubtitle ? (
        <p className={officialClass}>{display.officialName}</p>
      ) : null}
      {display.administratorByline ? (
        <p className={headingLevel === 1 ? "mt-1 text-base text-muted-foreground" : "mt-1 text-sm text-muted-foreground"}>
          {display.administratorByline}
        </p>
      ) : null}
      <AudienceTags tags={display.tags} className={headingLevel === 1 ? "mt-4" : "mt-3"} />
    </div>
  );
}
