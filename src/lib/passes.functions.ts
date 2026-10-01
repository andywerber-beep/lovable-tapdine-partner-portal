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

const docSchema = z.object({
  name: z.string().max(200),
  type: z.enum(["application/pdf", "image/png", "image/jpeg"]),
  base64: z.string().max(11_000_000), // ~8MB file
});

/** Venue owner uploads ID / insurance docs; status moves to under_review for the Admin Desk. */
export const submitCompliance = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        token: tokenSchema,
        idDoc: docSchema.optional(),
        insuranceDoc: docSchema.optional(),
        insuranceExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireVenueOwner, tapdineAdmin } = await import("./tapdine-db.server");
    const venue = await requireVenueOwner(data.token);
    const admin = tapdineAdmin();
    const needId = !venue.id_provided;
    const needIns = !venue.insurance_provided;
    if (needId && !data.idDoc) throw new Error("Please upload your owner ID.");
    if (needIns && (!data.insuranceDoc || !data.insuranceExpiry))
      throw new Error("Please upload your insurance certificate and its expiry date.");

    const upload = async (prefix: string, doc: z.infer<typeof docSchema>) => {
      const ext = doc.type === "application/pdf" ? "pdf" : doc.type === "image/png" ? "png" : "jpg";
      // Admin Desk looks for files starting "insurance-" in the venue's folder.
      const path = `${venue.id}/${prefix}-${Date.now()}.${ext}`;
      const { error } = await admin.storage
        .from("compliance-docs")
        .upload(path, Buffer.from(doc.base64, "base64"), { contentType: doc.type });
      if (error) {
        console.error("compliance upload failed", error);
        throw new Error("Could not upload your document. Please try again.");
      }
      return path;
    };

    const update: Record<string, unknown> = { status: "under_review" };
    if (needId && data.idDoc) {
      await upload("id_proof", data.idDoc);
      update.id_provided = true;
    }
    if (needIns && data.insuranceDoc) {
      update.insurance_doc_path = await upload("insurance", data.insuranceDoc);
      update.insurance_provided = true;
      update.insurance_expiry = data.insuranceExpiry;
    }
    const { error } = await admin.from("partners").update(update).eq("id", venue.id);
    if (error) {
      console.error("compliance update failed", error);
      throw new Error("Could not save your details. Please try again.");
    }
    return { ok: true as const };
  });

const text = (max: number) => z.string().trim().max(max);

/** Step 1: venue details + owner name. Geocodes the postcode and checks the FSA hygiene rating. */
export const saveVenueDetails = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        token: tokenSchema,
        name: text(120).min(2, "Please enter your venue name."),
        ownerName: text(120).min(2, "Please enter the owner's full name."),
        cuisineType: text(80).min(2, "Please enter a cuisine type."),
        telNumber: text(30).regex(/^[0-9+()\s-]{7,30}$/, "Please enter a valid phone number."),
        address1: text(160).min(3, "Please enter the first line of your address."),
        address2: text(160).optional().default(""),
        town: text(80).min(2, "Please enter your town or city."),
        postcode: text(10).regex(/^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/, "Please enter a valid UK postcode."),
        websiteUrl: text(300).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireVenueOwner, tapdineAdmin } = await import("./tapdine-db.server");
    const venue = await requireVenueOwner(data.token);
    const admin = tapdineAdmin();
    const postcode = data.postcode.toUpperCase().replace(/\s+/g, "").replace(/(\w{3})$/, " $1");

    // Location for proximity pings (free UK postcode lookup).
    let latitude: number | null = null;
    let longitude: number | null = null;
    try {
      const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
      if (r.ok) {
        const j = (await r.json()) as { result?: { latitude: number; longitude: number } };
        latitude = j.result?.latitude ?? null;
        longitude = j.result?.longitude ?? null;
      }
    } catch (e) {
      console.error("postcode lookup failed", e);
    }
    if (latitude == null) throw new Error("We couldn't find that postcode. Please check it and try again.");

    const update: Record<string, unknown> = {
      name: data.name,
      cuisine_type: data.cuisineType,
      tel_number: data.telNumber,
      address1: data.address1,
      address2: data.address2 || null,
      town: data.town,
      postcode,
      website_url: data.websiteUrl || null,
      latitude,
      longitude,
    };
    // Status stays details_pending; filled-in address means the agreement step is next.
    if (!venue.status) update.status = "details_pending";

    // Food hygiene rating from the Food Standards Agency: 3+ auto-accepts.
    try {
      const r = await fetch(
        `https://api.ratings.food.gov.uk/Establishments?name=${encodeURIComponent(data.name)}&address=${encodeURIComponent(postcode)}`,
        { headers: { accept: "application/json", "x-api-version": "2" } },
      );
      if (r.ok) {
        const j = (await r.json()) as { establishments?: Array<Record<string, unknown>> };
        const m = j.establishments?.[0];
        if (m) {
          const rating = String(m["RatingValue"] ?? "");
          update.fsa_business_id = m["FHRSID"] ?? null;
          update.fsa_rating = rating;
          update.fsa_rating_scheme = m["SchemeType"] ?? null;
          update.fsa_rating_date = m["RatingDate"] ?? null;
          update.fsa_checked_at = new Date().toISOString();
          if (Number(rating) >= 3) update.hygiene_provided = true;
        }
      }
    } catch (e) {
      console.error("FSA lookup failed", e);
    }

    let { error } = await admin.from("partners").update(update).eq("id", venue.id);
    if (error && /fsa_|column/i.test(error.message)) {
      for (const k of Object.keys(update)) if (k.startsWith("fsa_")) delete update[k];
      ({ error } = await admin.from("partners").update(update).eq("id", venue.id));
    }
    if (error) {
      console.error("details update failed", error);
      throw new Error("Could not save your details. Please try again.");
    }
    await admin.auth.admin
      .updateUserById(venue.user_id, { user_metadata: { owner_name: data.ownerName, venue_name: data.name } })
      .catch((e) => console.error("owner name save failed", e));
    return { ok: true as const };
  });

/** Step 2: founding-partner agreement accepted. */
export const acceptAgreement = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: tokenSchema, accepted: z.literal(true) }).parse(d))
  .handler(async ({ data }) => {
    const { requireVenueOwner, tapdineAdmin } = await import("./tapdine-db.server");
    const venue = await requireVenueOwner(data.token);
    if (venue.status !== "details_pending" || !venue.address1)
      return { ok: true as const };
    const { error } = await tapdineAdmin()
      .from("partners")
      .update({ status: "compliance_pending", commission_rate: 0 })
      .eq("id", venue.id);
    if (error) {
      console.error("agreement failed", error);
      throw new Error("Could not save your agreement. Please try again.");
    }
    return { ok: true as const };
  });

/** Step 5: approved venue opens the portal for the first time. */
export const enterPortal = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const { requireVenueOwner, tapdineAdmin } = await import("./tapdine-db.server");
    const venue = await requireVenueOwner(data.token);
    if (venue.status !== "approved") return { ok: true as const };
    const { error } = await tapdineAdmin().from("partners").update({ status: "active" }).eq("id", venue.id);
    if (error) {
      console.error("enter portal failed", error);
      throw new Error("Could not open your portal. Please try again.");
    }
    return { ok: true as const };
  });

/**
 * Registers a venue owner in the shared TapDine database and creates their
 * pending partner record so the admin desk can review them.
 */
export const registerTapdinePartner = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        email: z
          .string()
          .trim()
          .max(255)
          .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email address."),
        password: z.string().min(8).max(128),
        venueName: z.string().trim().min(2).max(120),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { tapdineAdmin } = await import("./tapdine-db.server");
    const admin = tapdineAdmin();

    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { venue_name: data.venueName },
    });
    if (error || !created.user) {
      const msg = error?.message ?? "";
      if (/already/i.test(msg)) throw new Error("An account with that email already exists.");
      console.error("tapdine signup failed", error);
      throw new Error("Could not create your account. Please try again.");
    }

    const userId = created.user.id;
    const { error: pErr } = await admin.from("partners").insert({
      id: userId,
      user_id: userId,
      name: data.venueName,
      email: data.email,
      commission_rate: 0,
      status: "details_pending",
    });
    if (pErr) {
      console.error("partner row failed", pErr);
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      throw new Error("Could not set up your venue record. Please try again.");
    }

    return { ok: true as const };
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

// ---------- Offers (shared TapDine database; the Customer App reads these) ----------

export type PartnerOffer = {
  id: number;
  title: string;
  description: string | null;
  discount_price: number | null;
  image_url: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

const OFFER_COLS = "id, title, description, discount_price, image_url, expires_at, is_active, created_at";

export const getPartnerOffers = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const { requireVenueOwner, tapdineAdmin } = await import("./tapdine-db.server");
    const venue = await requireVenueOwner(data.token);
    const { data: rows, error } = await tapdineAdmin()
      .from("offers")
      .select(OFFER_COLS)
      .eq("venue_id", venue.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) {
      console.error("offers load failed", error);
      throw new Error("Could not load your offers.");
    }
    return (rows ?? []) as PartnerOffer[];
  });

export const createPartnerOffer = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        token: tokenSchema,
        title: z.string().trim().min(3).max(80),
        description: z.string().trim().min(3).max(200),
        price: z.number().positive().max(500),
        hours: z.number().int().min(1).max(24),
        imageBase64: z.string().min(100).max(4_000_000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireVenueOwner, tapdineAdmin } = await import("./tapdine-db.server");
    const venue = await requireVenueOwner(data.token);
    if (!["active", "approved", "live"].includes(String(venue.status)))
      throw new Error("Your venue must be approved before publishing offers.");
    const admin = tapdineAdmin();
    const path = `offers/${venue.id}/${Date.now()}.jpg`;
    const bytes = Uint8Array.from(atob(data.imageBase64), (c) => c.charCodeAt(0));
    const { error: upErr } = await admin.storage
      .from("venue-media")
      .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
    if (upErr) {
      console.error("offer photo upload failed", upErr);
      throw new Error("Could not upload the photo. Please try again.");
    }
    const image_url = admin.storage.from("venue-media").getPublicUrl(path).data.publicUrl;
    // One live offer per venue keeps the map simple: retire any previous one.
    await admin.from("offers").update({ is_active: false }).eq("venue_id", venue.id).eq("is_active", true);
    const { error } = await admin.from("offers").insert({
      venue_id: venue.id,
      title: data.title,
      description: data.description,
      discount_price: data.price,
      discount_type: "Flash Promotion",
      proximity_ping: true,
      image_url,
      is_active: true,
      expires_at: new Date(Date.now() + data.hours * 3_600_000).toISOString(),
    });
    if (error) {
      console.error("offer insert failed", error);
      throw new Error("Could not publish the offer.");
    }
    return { ok: true as const };
  });

export const retireOffer = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: tokenSchema, offerId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const { requireVenueOwner, tapdineAdmin } = await import("./tapdine-db.server");
    const venue = await requireVenueOwner(data.token);
    const { error } = await tapdineAdmin()
      .from("offers")
      .update({ is_active: false, expires_at: new Date().toISOString() })
      .eq("id", data.offerId)
      .eq("venue_id", venue.id);
    if (error) throw new Error("Could not end the offer.");
    return { ok: true as const };
  });

// ---------- Live ticket board ----------

export const getLiveTickets = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const { requireVenueOwner, tapdineAdmin, PASS_WINDOW_MS } = await import("./tapdine-db.server");
    const venue = await requireVenueOwner(data.token);
    const { data: rows, error } = await tapdineAdmin()
      .from("transactions")
      .select(PASS_COLS)
      .eq("partner_id", venue.id)
      .is("redeemed_at", null)
      .gt("paid_at", new Date(Date.now() - PASS_WINDOW_MS).toISOString())
      .order("paid_at", { ascending: true })
      .limit(50);
    if (error) {
      console.error("tickets failed", error);
      throw new Error("Could not load tickets.");
    }
    return (rows ?? []).map((r) => toPass(r, PASS_WINDOW_MS)).filter((p) => p.state === "ready");
  });

export const markTicketServed = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: tokenSchema, id: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const { requireVenueOwner, tapdineAdmin } = await import("./tapdine-db.server");
    const venue = await requireVenueOwner(data.token);
    const { data: row, error } = await tapdineAdmin()
      .from("transactions")
      .update({ redeemed_at: new Date().toISOString(), status: "redeemed", redeemed: true })
      .eq("id", data.id)
      .eq("partner_id", venue.id)
      .is("redeemed_at", null)
      .select("id")
      .maybeSingle();
    if (error) throw new Error("Could not mark as served.");
    return { ok: Boolean(row) };
  });
