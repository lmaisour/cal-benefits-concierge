/**
 * Supabase environment helpers.
 *
 * Service-role keys must only be read on the server. The browser may only
 * receive the public URL and anon key, and even those should go through
 * server routes for sensitive operations.
 */

export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
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
  const anonKey = readRequired("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicConfig() !== null;
}

export function getSupabaseServiceRoleKey(): string | null {
  return readRequired("SUPABASE_SERVICE_ROLE_KEY") ?? null;
}
