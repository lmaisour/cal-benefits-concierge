import { cn } from "@/lib/utils/cn";

export type QuestionOption<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
};

export function OptionsQuestion<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  describedBy,
}: {
  name: string;
  legend: string;
  options: QuestionOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  describedBy?: string;
}) {
  return (
    <fieldset aria-describedby={describedBy} className="space-y-3">
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => {
        const checked = value === option.value;
        const id = `${name}-${option.value}`;
        return (
          <label
            key={option.value}
            htmlFor={id}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 text-left transition-colors",
              checked
                ? "border-primary bg-hero"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="mt-1 h-5 w-5 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <span>
              <span className="block text-lg font-medium text-foreground">
                {option.label}
              </span>
              {option.description ? (
                <span className="mt-1 block text-sm text-muted-foreground">
                  {option.description}
                </span>
              ) : null}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
