import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchMyVenue,
  fetchVenueOffers,
  timeLeft,
  daysUntil,
  type Venue,
} from "@/lib/tapdine";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Partner Portal — Publish TapDine Offers" },
      {
        name: "description",
        content:
          "Manage your TapDine venue: publish time-limited offers with photos, link your menu, upload your public liability certificate and track approval.",
      },
      { property: "og:title", content: "Partner Portal — Publish TapDine Offers" },
      {
        property: "og:description",
        content: "Publish an offer, set the expiry, and ping every customer nearby.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: Dashboard,
});

function Dashboard() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();

  const { data: venue, isLoading } = useQuery({
    queryKey: ["my-venue", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => fetchMyVenue(user!.id),
  });

  if (loading) return <Shell><p className="text-sm text-muted-foreground">Loading…</p></Shell>;

  if (!user) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">Partner portal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to manage your venue and publish offers.
        </p>
        <Link
          to="/sign-in"
          search={{ redirect: "/dashboard" }}
          className="mt-6 inline-block rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground"
        >
          Sign in
        </Link>
      </Shell>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/85 px-6 py-4 backdrop-blur">
        <Logo size={28} subtitle="Partner Portal" />
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          
          <span className="hidden sm:inline">{user.email}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="rounded-full border border-border px-3 py-1.5 hover:bg-surface"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl space-y-8 px-6 py-10">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading your venue…</p>
        ) : (
          <>
            <StatusBanner venue={venue ?? null} />
            <VenueForm
              venue={venue ?? null}
              userId={user.id}
              onSaved={() => qc.invalidateQueries({ queryKey: ["my-venue", user.id] })}
            />
            {venue && <OffersPanel venue={venue} />}
          </>
        )}
      </main>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 px-6 py-4">
        <Logo size={28} subtitle="Partner Portal" />
      </header>
      <main className="mx-auto w-full max-w-3xl px-6 py-20">{children}</main>
    </div>
  );
}

function StatusBanner({ venue }: { venue: Venue | null }) {
  if (!venue) {
    return (
      <div className="rounded-2xl border border-warning/40 bg-warning/10 p-5">
        <p className="text-sm font-semibold text-warning">Step 1 — tell us about your venue</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add your details and upload your public liability certificate. The admin desk verifies
          the certificate and records its expiry date, then your pin goes live.
        </p>
      </div>
    );
  }
  const days = daysUntil(venue.insurance_expiry);
  const tone =
    venue.status === "approved"
      ? "border-success/40 bg-success/10 text-success"
      : venue.status === "rejected"
        ? "border-brand/40 bg-brand/10 text-brand"
        : "border-warning/40 bg-warning/10 text-warning";
  return (
    <div className={`rounded-2xl border p-5 ${tone}`}>
      <p className="text-sm font-semibold capitalize">
        {venue.status === "approved"
          ? "Live on the customer map"
          : venue.status === "rejected"
            ? "Not approved"
            : "Awaiting verification"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {venue.review_note ||
          (venue.status === "approved"
            ? days !== null
              ? `Insurance cover recorded — ${days} days remaining.`
              : "Approved."
            : "The admin desk is checking your certificate.")}
      </p>
    </div>
  );
}

const EMPTY = {
  name: "",
  category: "Coffee shop",
  address: "",
  lat: "51.5155",
  lng: "-0.1225",
  website_url: "",
  menu_url: "",
  phone: "",
};

function VenueForm({
  venue,
  userId,
  onSaved,
}: {
  venue: Venue | null;
  userId: string;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!venue) return;
    setForm({
      name: venue.name,
      category: venue.category,
      address: venue.address,
      lat: String(venue.lat),
      lng: String(venue.lng),
      website_url: venue.website_url ?? "",
      menu_url: venue.menu_url ?? "",
      phone: venue.phone ?? "",
    });
  }, [venue]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        owner_id: userId,
        name: form.name,
        category: form.category,
        address: form.address,
        lat: Number(form.lat),
        lng: Number(form.lng),
        website_url: form.website_url || null,
        menu_url: form.menu_url || null,
        phone: form.phone || null,
      };
      const { error } = venue
        ? await supabase.from("venues").update(payload).eq("id", venue.id)
        : await supabase.from("venues").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      setMsg("Saved.");
      onSaved();
    },
    onError: (e) => setMsg(e instanceof Error ? e.message : "Could not save."),
  });

  async function uploadCert(file: File) {
    if (!venue) return;
    setUploading(true);
    const path = `${userId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("compliance-docs").upload(path, file);
    if (!error) {
      await supabase.from("venues").update({ insurance_doc_path: path }).eq("id", venue.id);
      onSaved();
      setMsg("Certificate uploaded — the admin desk will verify it.");
    } else {
      setMsg(error.message);
    }
    setUploading(false);
  }

  const field = (k: keyof typeof EMPTY, label: string, type = "text") => (
    <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {label}
      <input
        type={type}
        value={form[k]}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-foreground focus:border-brand focus:outline-none"
      />
    </label>
  );

  return (
    <section className="rounded-3xl border border-border bg-surface p-6">
      <h2 className="text-lg font-bold">Venue profile</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Your pin position, menu link and contact details on the customer map.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {field("name", "Venue name")}
        {field("category", "Category")}
        <div className="sm:col-span-2">{field("address", "Address")}</div>
        {field("lat", "Latitude")}
        {field("lng", "Longitude")}
        {field("website_url", "Website")}
        {field("menu_url", "Menu link")}
        {field("phone", "Phone")}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          disabled={save.isPending || !form.name}
          onClick={() => save.mutate()}
          className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-brand-foreground disabled:opacity-40"
        >
          {venue ? "Save changes" : "Create venue"}
        </button>
        {venue && (
          <label className="cursor-pointer rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-surface-raised">
            {uploading
              ? "Uploading…"
              : venue.insurance_doc_path
                ? "Replace insurance certificate"
                : "Upload insurance certificate"}
            <input
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadCert(f);
              }}
            />
          </label>
        )}
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      </div>
    </section>
  );
}

function OffersPanel({ venue }: { venue: Venue }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [hours, setHours] = useState(2);
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: offers = [] } = useQuery({
    queryKey: ["venue-offers", venue.id],
    queryFn: () => fetchVenueOffers(venue.id),
    refetchInterval: 60_000,
  });

  async function publish() {
    setBusy(true);
    let image_url: string | null = null;
    if (photo) {
      const path = `${venue.id}/${Date.now()}-${photo.name}`;
      const { error } = await supabase.storage.from("offer-photos").upload(path, photo);
      if (!error) {
        image_url = supabase.storage.from("offer-photos").getPublicUrl(path).data.publicUrl;
      }
    }
    const { error } = await supabase.from("offers").insert({
      venue_id: venue.id,
      title,
      price_text: price || null,
      image_url,
      starts_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + hours * 3_600_000).toISOString(),
    });
    setBusy(false);
    if (error) return alert(error.message);
    setTitle("");
    setPrice("");
    setPhoto(null);
    qc.invalidateQueries({ queryKey: ["venue-offers", venue.id] });
    qc.invalidateQueries({ queryKey: ["public-venues"] });
  }

  async function endOffer(id: string) {
    await supabase.from("offers").update({ expires_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["venue-offers", venue.id] });
    qc.invalidateQueries({ queryKey: ["public-venues"] });
  }

  const live = offers.filter((o) => new Date(o.expires_at).getTime() > Date.now());
  const past = offers.filter((o) => new Date(o.expires_at).getTime() <= Date.now());

  return (
    <section className="rounded-3xl border border-border bg-surface p-6">
      <h2 className="text-lg font-bold">Offer board</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Publishing an offer turns your pin green and pings every customer inside your radius until
        the countdown ends.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-[2fr_1fr_auto_auto]">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="10% off lobster rolls"
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
        />
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="£8.50"
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
        />
        <select
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
        >
          {[1, 2, 3, 4, 6, 8, 12, 24].map((h) => (
            <option key={h} value={h}>
              {h}h
            </option>
          ))}
        </select>
        <button
          disabled={busy || !title || venue.status !== "approved"}
          onClick={publish}
          className="rounded-xl bg-success px-5 py-2.5 text-sm font-semibold text-success-foreground disabled:opacity-40"
        >
          {busy ? "Publishing…" : "Publish"}
        </button>
      </div>

      <label className="mt-3 inline-block cursor-pointer text-xs font-semibold text-brand">
        {photo ? photo.name : "+ Add a photo (optional)"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
      </label>
      {venue.status !== "approved" && (
        <p className="mt-2 text-xs text-warning">
          Offers can be published once the admin desk approves your venue.
        </p>
      )}

      <div className="mt-8 space-y-2">
        {live.map((o) => (
          <div
            key={o.id}
            className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/5 px-4 py-3"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="pin-pulse absolute inset-0 rounded-full bg-success" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-success" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {o.title}
              {o.price_text ? ` · ${o.price_text}` : ""}
            </span>
            <span className="text-xs text-warning">{timeLeft(o.expires_at)}</span>
            <button
              onClick={() => endOffer(o.id)}
              className="rounded-full border border-border px-3 py-1 text-[11px] hover:bg-surface-raised"
            >
              End now
            </button>
          </div>
        ))}
        {live.length === 0 && (
          <p className="text-sm text-muted-foreground">No live offers right now.</p>
        )}
        {past.slice(0, 5).map((o) => (
          <div
            key={o.id}
            className="flex items-center gap-3 rounded-2xl border border-border/60 px-4 py-2.5 text-xs text-muted-foreground"
          >
            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            <span className="flex-1 truncate">{o.title}</span>
            <span>expired</span>
          </div>
        ))}
      </div>
    </section>
  );
}
