import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only access to the shared TapDine (customer app) database.
// Uses the private key, so every caller must pass requireVenueOwner first.

function baseUrl() {
  const raw = process.env["TAPDINE_SUPABASE_URL"];
  if (!raw) throw new Error("TapDine database is not configured");
  return raw.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
}

function keyFetch(key: string): typeof fetch {
  return (input, init) => {
    const h = new Headers(init?.headers);
    if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
    h.set("apikey", key);
    return fetch(input, { ...init, headers: h });
  };
}

export function tapdineAdmin(): SupabaseClient {
  const key = process.env["TAPDINE_SUPABASE_SECRET_KEY"];
  if (!key) throw new Error("TapDine database is not configured");
  return createClient(baseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: { fetch: keyFetch(key) },
  });
}

export function tapdinePublicConfig() {
  const key = process.env["TAPDINE_SUPABASE_PUBLISHABLE_KEY"];
  if (!key) throw new Error("TapDine database is not configured");
  return { url: baseUrl(), key };
}

export type OwnedVenue = { id: string; name: string | null };

/** Validates the TapDine access token and returns the partner row this user owns. */
export async function requireVenueOwner(token: string): Promise<OwnedVenue> {
  const admin = tapdineAdmin();
  const { data: userData, error } = await admin.auth.getUser(token);
  if (error || !userData.user) throw new Error("Please sign in again.");
  const { data: partner, error: pErr } = await admin
    .from("partners")
    .select("id, name")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (pErr) {
    console.error("partner lookup failed", pErr);
    throw new Error("Could not load your venue.");
  }
  if (!partner) throw new Error("This account isn't linked to a venue yet.");
  return partner as OwnedVenue;
}

export const PASS_WINDOW_MS = 30 * 60 * 1000;
