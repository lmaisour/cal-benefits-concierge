export function QuestionnaireProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        Step {current} of {total}
      </p>
      <div
        role="progressbar"
        aria-label={`Step ${current} of ${total}`}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
