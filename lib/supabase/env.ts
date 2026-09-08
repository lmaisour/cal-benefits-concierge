/**
 * Supabase environment helpers.
 *
 * Secret keys must only be read on the server. The browser may only
 * receive the public URL and publishable key, and even those should go
 * through server routes for sensitive operations.
 */

export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

function readRequired(name: string): string | undefined {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  return value;
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = readRequired("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = readRequired("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  if (!url || !publishableKey) {
    return null;
  }

  return { url, publishableKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicConfig() !== null;
}

export function getSupabaseSecretKey(): string | null {
  return readRequired("SUPABASE_SECRET_KEY") ?? null;
}

export function getAdminPassword(): string | null {
  return readRequired("ADMIN_PASSWORD") ?? null;
}
