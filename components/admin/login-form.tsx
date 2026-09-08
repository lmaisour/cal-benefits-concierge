"use client";

import { useActionState } from "react";
import { loginAction, type LoginActionState } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";

const initial: LoginActionState = { ok: false };

export function AdminLoginForm({
  from,
  configured,
}: {
  from: string;
  configured: boolean;
}) {
  const [state, action, pending] = useActionState(loginAction, initial);

  if (!configured) {
    return (
      <p className="rounded-lg border border-border bg-muted px-4 py-3 text-sm" role="alert">
        Admin is not configured. Set ADMIN_PASSWORD on the server.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="from" value={from} />
      <label className="block text-sm font-medium">
        Password
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
      </label>
      {state.error ? (
        <p className="text-sm text-accent" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
