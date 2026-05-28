// SERVER ONLY. Never import in a client component.
// Bypasses RLS. Used for trusted server writes (interaction logging, promotions).

import { createClient } from "@supabase/supabase-js";

export async function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY missing — service client unavailable.",
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
