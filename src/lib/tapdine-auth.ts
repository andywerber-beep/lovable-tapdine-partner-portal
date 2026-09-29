import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getTapdineAuthConfig } from "./passes.functions";

let client: SupabaseClient | null = null;
let pending: Promise<SupabaseClient> | null = null;

/** Browser-side client for the shared TapDine database (partner accounts live here). */
export function getTapdineClient(
  loadConfig: () => Promise<{ url: string; key: string }> = () => getTapdineAuthConfig(),
): Promise<SupabaseClient> {
  if (client) return Promise.resolve(client);
  pending ??= loadConfig().then(({ url, key }) => {
    client ??= createClient(url, key, {
      auth: {
        storageKey: "tapdine-partner-auth",
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return client;
  });
  return pending;
}
