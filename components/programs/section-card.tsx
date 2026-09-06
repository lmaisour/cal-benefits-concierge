import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function SectionCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(28,25,23,0.05),0_10px_24px_rgba(28,25,23,0.04)] sm:p-6",
        className,
      )}
    >
      <h2 className="font-serif text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h2>
      <div className="mt-4 text-base leading-relaxed text-foreground">{children}</div>
    </section>
  );
}
