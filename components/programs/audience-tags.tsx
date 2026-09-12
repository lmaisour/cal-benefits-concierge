import { cn } from "@/lib/utils/cn";

export function AudienceTags({
  tags,
  className,
}: {
  tags: string[];
  className?: string;
}) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <ul
      aria-label="Audience tags"
      className={cn("flex flex-wrap gap-1.5", className)}
    >
      {tags.map((tag) => (
        <li
          key={tag}
          className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}
