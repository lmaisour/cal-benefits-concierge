import { Button } from "@/components/ui/button";

export function NumberQuestion({
  id,
  label,
  value,
  onChange,
  min,
  max,
  prefix,
  inputMode = "decimal",
  describedBy,
  stepper = false,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  prefix?: string;
  inputMode?: "numeric" | "decimal";
  describedBy?: string;
  stepper?: boolean;
  placeholder?: string;
}) {
  function bump(delta: number) {
    const current = Number.parseInt(value, 10);
    const next = Number.isFinite(current) ? current + delta : (min ?? 1);
    const clamped = Math.min(max ?? next, Math.max(min ?? next, next));
    onChange(String(clamped));
  }

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-2">
        {stepper ? (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            aria-label="Decrease"
            onClick={() => bump(-1)}
            className="w-12 px-0"
          >
            −
          </Button>
        ) : null}
        <div className="relative min-w-0 flex-1">
          {prefix ? (
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-lg text-muted-foreground"
            >
              {prefix}
            </span>
          ) : null}
          <input
            id={id}
            type="text"
            inputMode={inputMode}
            autoComplete="off"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-describedby={describedBy}
            placeholder={placeholder}
            className={`h-14 w-full rounded-xl border border-border bg-card text-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              prefix ? "pr-4 pl-8" : "px-4"
            }`}
          />
        </div>
        {stepper ? (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            aria-label="Increase"
            onClick={() => bump(1)}
            className="w-12 px-0"
          >
            +
          </Button>
        ) : null}
      </div>
    </div>
  );
}
