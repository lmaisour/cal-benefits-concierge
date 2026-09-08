"use client";

import type { ReactNode } from "react";

export function ConfirmSubmit({
  action,
  message,
  children,
  className,
}: {
  action: () => Promise<void>;
  message: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </form>
  );
}
