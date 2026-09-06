import { cn } from "@/lib/utils/cn";

export function MultiSelectQuestion({
  legend,
  options,
  values,
  onToggle,
  everythingChecked,
  onToggleEverything,
  describedBy,
}: {
  legend: string;
  options: { value: string; label: string }[];
  values: string[];
  onToggle: (value: string) => void;
  everythingChecked: boolean;
  onToggleEverything: () => void;
  describedBy?: string;
}) {
  return (
    <fieldset aria-describedby={describedBy} className="space-y-3">
      <legend className="sr-only">{legend}</legend>
      <label
        htmlFor="interest-everything"
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-4",
          everythingChecked
            ? "border-primary bg-hero"
            : "border-border bg-card hover:bg-muted",
        )}
      >
        <input
          id="interest-everything"
          type="checkbox"
          checked={everythingChecked}
          onChange={onToggleEverything}
          className="h-5 w-5 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <span className="text-lg font-medium text-foreground">Everything</span>
      </label>
      {options.map((option) => {
        const id = `interest-${option.value}`;
        const checked = values.includes(option.value);
        return (
          <label
            key={option.value}
            htmlFor={id}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-4",
              checked
                ? "border-primary bg-hero"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            <input
              id={id}
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(option.value)}
              className="h-5 w-5 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <span className="text-lg font-medium text-foreground">
              {option.label}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
