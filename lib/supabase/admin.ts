import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabasePublicConfig,
  getSupabaseSecretKey,
} from "@/lib/supabase/env";
import type { Database } from "@/types/database";

export type SupabaseAdminClient = SupabaseClient<Database>;

export function createSupabaseAdminClient(): SupabaseAdminClient {
  const config = getSupabasePublicConfig();
  const secretKey = getSupabaseSecretKey();

  if (!config || !secretKey) {
    throw new Error(
      "Admin database access is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SECRET_KEY.",
    );
  }

  return createClient<Database>(config.url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
