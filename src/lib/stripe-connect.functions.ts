import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Stripe Connect (Express, GB) onboarding for venue payouts.
// Every call validates the TapDine login token and the caller's own partners row first.

const tokenOnly = z.object({ token: z.string().min(10) });

async function ctx(token: string) {
  const { requireVenueOwner, tapdineAdmin } = await import("./tapdine-db.server");
  const venue = await requireVenueOwner(token);
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("Payouts aren't configured yet. Please try again later.");
  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
  const admin = tapdineAdmin();
  const { data } = await admin
    .from("partners")
    .select("stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_onboarded_at")
    .eq("id", venue.id)
    .single();
  return { venue, stripe, admin, row: (data ?? {}) as Record<string, unknown> };
}

type Status = { connected: boolean; chargesEnabled: boolean; payoutsEnabled: boolean; detailsSubmitted: boolean };

export const getStripeAccountStatus = createServerFn({ method: "POST" })
  .inputValidator((d) => tokenOnly.parse(d))
  .handler(async ({ data }): Promise<Status> => {
    const { venue, stripe, admin, row } = await ctx(data.token);
    const accountId = row["stripe_account_id"] as string | null;
    if (!accountId) return { connected: false, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false };
    try {
      const acct = await stripe.accounts.retrieve(accountId);
      const charges = !!acct.charges_enabled, payouts = !!acct.payouts_enabled;
      const patch: Record<string, unknown> = { stripe_charges_enabled: charges, stripe_payouts_enabled: payouts };
      if (charges && payouts && !row["stripe_onboarded_at"]) patch["stripe_onboarded_at"] = new Date().toISOString();
      const { error } = await admin.from("partners").update(patch).eq("id", venue.id);
      if (error) console.error("stripe status save failed", error);
      return { connected: true, chargesEnabled: charges, payoutsEnabled: payouts, detailsSubmitted: !!acct.details_submitted };
    } catch (e) {
      console.error("stripe retrieve failed", e);
      throw new Error("Couldn't check your payout status right now.");
    }
  });

export const createStripeConnectOnboarding = createServerFn({ method: "POST" })
  .inputValidator((d) => tokenOnly.extend({ origin: z.string().url() }).parse(d))
  .handler(async ({ data }) => {
    const { venue, stripe, admin, row } = await ctx(data.token);
    const allowed = /^https:\/\/([a-z0-9-]+\.)*(tapdine\.app|lovable\.app|lovableproject\.com)$|^http:\/\/localhost(:\d+)?$/;
    const origin = allowed.test(data.origin) ? data.origin : "https://partners.tapdine.app";
    let accountId = row["stripe_account_id"] as string | null;
    try {
      if (!accountId) {
        const acct = await stripe.accounts.create({
          type: "express",
          country: "GB",
          ...(venue.email ? { email: venue.email } : {}),
          business_profile: { mcc: "5812", ...(venue.name ? { name: venue.name } : {}), ...(venue.website_url ? { url: venue.website_url } : {}) },
          capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
          metadata: { partner_id: String(venue.id) },
        });
        accountId = acct.id;
        const { error } = await admin.from("partners").update({ stripe_account_id: accountId }).eq("id", venue.id);
        if (error) { console.error("save stripe id failed", error); throw new Error("save failed"); }
      }
      const link = await stripe.accountLinks.create({
        account: accountId,
        type: "account_onboarding",
        refresh_url: `${origin}/dashboard?stripe=refresh`,
        return_url: `${origin}/dashboard?stripe=return`,
      });
      return { url: link.url };
    } catch (e) {
      console.error("stripe onboarding failed", e);
      throw new Error("Couldn't start payout setup. Please try again.");
    }
  });

export const createStripeDashboardLink = createServerFn({ method: "POST" })
  .inputValidator((d) => tokenOnly.parse(d))
  .handler(async ({ data }) => {
    const { stripe, row } = await ctx(data.token);
    const accountId = row["stripe_account_id"] as string | null;
    if (!accountId) throw new Error("Payouts aren't set up yet.");
    try {
      const link = await stripe.accounts.createLoginLink(accountId);
      return { url: link.url };
    } catch (e) {
      console.error("stripe login link failed", e);
      throw new Error("Couldn't open your payouts dashboard.");
    }
  });
