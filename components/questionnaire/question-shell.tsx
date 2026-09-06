import type { FormEvent, ReactNode, Ref } from "react";
import { Button } from "@/components/ui/button";

export function QuestionShell({
  title,
  titleRef,
  helper,
  helperId,
  error,
  errorId,
  children,
  onSubmit,
  onBack,
  onStartOver,
  canGoBack,
  continueLabel = "Continue",
  optionalHint,
}: {
  title: string;
  titleRef?: Ref<HTMLHeadingElement>;
  helper?: string;
  helperId?: string;
  error?: string | null;
  errorId?: string;
  children: ReactNode;
  onSubmit: () => void;
  onBack: () => void;
  onStartOver: () => void;
  canGoBack: boolean;
  continueLabel?: string;
  optionalHint?: string;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div>
        <h1
          ref={titleRef}
          tabIndex={-1}
          className="font-serif text-3xl font-semibold tracking-tight text-foreground outline-none sm:text-4xl"
        >
          {title}
        </h1>
        {helper ? (
          <p id={helperId} className="mt-3 text-base leading-relaxed text-muted-foreground">
            {helper}
          </p>
        ) : null}
        {optionalHint ? (
          <p className="mt-2 text-sm text-muted-foreground">{optionalHint}</p>
        ) : null}
      </div>

      <div>{children}</div>

      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-accent">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" className="w-full sm:w-auto">
          {continueLabel}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full sm:w-auto"
          onClick={onBack}
          disabled={!canGoBack}
        >
          Back
        </Button>
      </div>

      <button
        type="button"
        onClick={onStartOver}
        className="self-start text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Start over
      </button>
    </form>
  );
}
