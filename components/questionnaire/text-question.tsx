export function TextQuestion({
  id,
  label,
  value,
  onChange,
  inputMode,
  maxLength,
  autoComplete,
  describedBy,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "text" | "numeric" | "decimal";
  maxLength?: number;
  autoComplete?: string;
  describedBy?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={describedBy}
        placeholder={placeholder}
        className="mt-2 h-14 w-full rounded-xl border border-border bg-card px-4 text-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}
