import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

export type SupabaseServerClient = SupabaseClient<Database>;

export function createSupabaseServerClient(): SupabaseServerClient {
  const config = getSupabasePublicConfig();

  if (!config) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
    );
  }

  return createClient<Database>(config.url, config.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
