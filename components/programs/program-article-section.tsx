import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function ProgramArticleSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b border-border py-8 last:border-b-0 last:pb-0", className)}>
      <h2 className="font-serif text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h2>
      <div className="mt-4 text-base leading-relaxed text-foreground">{children}</div>
    </section>
  );
}
