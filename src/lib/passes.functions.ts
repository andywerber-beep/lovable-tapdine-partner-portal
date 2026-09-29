import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const tokenSchema = z.string().min(20).max(4096);

export type PassView = {
  id: number;
  claim_code: string;
  offer_title: string | null;
  total_amount: number;
  paid_at: string | null;
  redeemed_at: string | null;
  status: string | null;
  expires_at: string | null;
  state: "ready" | "redeemed" | "expired" | "unpaid";
};

function toPass(row: Record<string, unknown>, windowMs: number): PassView {
  const paid = row.paid_at ? new Date(String(row.paid_at)).getTime() : null;
  const expires = paid ? paid + windowMs : null;
  const redeemed = Boolean(row.redeemed_at) || row.status === "redeemed" || row.redeemed === true;
  const state: PassView["state"] = redeemed
    ? "redeemed"
    : !paid
      ? "unpaid"
      : Date.now() > (expires as number)
        ? "expired"
        : "ready";
  return {
    id: Number(row.id),
    claim_code: String(row.claim_code ?? ""),
    offer_title: (row.offer_title as string) ?? null,
    total_amount: Number(row.total_amount ?? row.amount ?? 0),
    paid_at: (row.paid_at as string) ?? null,
    redeemed_at: (row.redeemed_at as string) ?? null,
    status: (row.status as string) ?? null,
    expires_at: expires ? new Date(expires).toISOString() : null,
    state,
  };
}

const PASS_COLS =
  "id, partner_id, claim_code, offer_title, total_amount, amount, paid_at, redeemed, redeemed_at, status";

export const getTapdineAuthConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { tapdinePublicConfig } = await import("./tapdine-db.server");
  return tapdinePublicConfig();
});

export const getMyTapdineVenue = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const { requireVenueOwner } = await import("./tapdine-db.server");
    return requireVenueOwner(data.token);
  });

async function findPass(token: string, code: string) {
  const { requireVenueOwner, tapdineAdmin, PASS_WINDOW_MS } = await import("./tapdine-db.server");
  const venue = await requireVenueOwner(token);
  const { data: row, error } = await tapdineAdmin()
    .from("transactions")
    .select(PASS_COLS)
    .ilike("claim_code", code)
    .maybeSingle();
  if (error) {
    console.error("pass lookup failed", error);
    throw new Error("Could not look up that code.");
  }
  if (!row) return { venue, pass: null, error: "No pass found with that code." };
  if (row.partner_id !== venue.id)
    return { venue, pass: null, error: "This pass belongs to a different venue." };
  return { venue, pass: toPass(row, PASS_WINDOW_MS), error: null as string | null };
}

const codeSchema = z
  .string()
  .trim()
  .min(3)
  .max(40)
  .regex(/^[A-Za-z0-9-]+$/, "Codes use letters, numbers and dashes only");

export const lookupPass = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: tokenSchema, code: codeSchema }).parse(d))
  .handler(async ({ data }) => {
    const { pass, error } = await findPass(data.token, data.code);
    return { pass, error };
  });

export const redeemPass = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: tokenSchema, code: codeSchema }).parse(d))
  .handler(async ({ data }) => {
    const { tapdineAdmin, PASS_WINDOW_MS } = await import("./tapdine-db.server");
    const { venue, pass, error } = await findPass(data.token, data.code);
    if (!pass) return { pass: null, error };
    if (pass.state === "redeemed") return { pass, error: "This pass has already been redeemed." };
    if (pass.state === "unpaid") return { pass, error: "This pass hasn't been paid for." };
    if (pass.state === "expired") return { pass, error: "This pass has expired." };

    const now = new Date().toISOString();
    // Guarded update: only succeeds if still unredeemed and owned by this venue.
    const { data: updated, error: uErr } = await tapdineAdmin()
      .from("transactions")
      .update({ redeemed_at: now, status: "redeemed", redeemed: true })
      .eq("id", pass.id)
      .eq("partner_id", venue.id)
      .is("redeemed_at", null)
      .gt("paid_at", new Date(Date.now() - PASS_WINDOW_MS).toISOString())
      .select(PASS_COLS)
      .maybeSingle();
    if (uErr) {
      console.error("redeem failed", uErr);
      return { pass, error: "Could not redeem this pass. Please try again." };
    }
    if (!updated) return { pass, error: "This pass can no longer be redeemed." };
    return { pass: toPass(updated, PASS_WINDOW_MS), error: null };
  });

function londonStart(unit: "day" | "week" | "month"): Date {
  const now = new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  let y = Number(parts.year);
  let m = Number(parts.month);
  let d = Number(parts.day);
  if (unit === "month") d = 1;
  if (unit === "week") {
    const idx = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday ?? "Mon");
    const dt = new Date(Date.UTC(y, m - 1, d - idx));
    y = dt.getUTCFullYear();
    m = dt.getUTCMonth() + 1;
    d = dt.getUTCDate();
  }
  // Offset of London from UTC right now (0 or 60 minutes).
  const londonNowAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
  );
  const offset = Math.round((londonNowAsUtc - now.getTime()) / 60000) * 60000;
  return new Date(Date.UTC(y, m - 1, d) - offset);
}

export const getEarnings = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const { requireVenueOwner, tapdineAdmin, PASS_WINDOW_MS } = await import("./tapdine-db.server");
    const venue = await requireVenueOwner(data.token);
    const { data: rows, error } = await tapdineAdmin()
      .from("transactions")
      .select(`${PASS_COLS}, commission_amount, partner_payout`)
      .eq("partner_id", venue.id)
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false })
      .limit(1000);
    if (error) {
      console.error("earnings failed", error);
      throw new Error("Could not load earnings.");
    }
    const list = (rows ?? []).map((r) => {
      const total = Number(r.total_amount ?? r.amount ?? 0);
      const commission = r.commission_amount != null ? Number(r.commission_amount) : total * 0.1;
      const share = r.partner_payout != null ? Number(r.partner_payout) : total - commission;
      return { ...toPass(r, PASS_WINDOW_MS), commission, share };
    });
    const bucket = (from: Date) => {
      const rs = list.filter((r) => r.paid_at && new Date(r.paid_at) >= from);
      const sum = (k: "total_amount" | "share" | "commission") =>
        Math.round(rs.reduce((a, r) => a + r[k], 0) * 100) / 100;
      return { count: rs.length, sales: sum("total_amount"), share: sum("share"), commission: sum("commission") };
    };
    return {
      venueName: venue.name,
      totals: {
        today: bucket(londonStart("day")),
        week: bucket(londonStart("week")),
        month: bucket(londonStart("month")),
      },
      redeemedCount: list.filter((r) => r.state === "redeemed").length,
      unredeemedCount: list.filter((r) => r.state !== "redeemed").length,
      claims: list.slice(0, 200),
    };
  });
