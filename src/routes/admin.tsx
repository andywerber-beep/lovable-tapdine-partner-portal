import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { fetchAllVenues, daysUntil, type Venue } from "@/lib/tapdine";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Desk — TAPDINE Verification" },
      {
        name: "description",
        content:
          "The TAPDINE admin desk: verify public liability insurance certificates, record expiry dates and approve venues onto the live customer map.",
      },
      { property: "og:title", content: "Admin Desk — TAPDINE Verification" },
      {
        property: "og:description",
        content: "Role-gated approvals, insurance expiry tracking and hygiene checks.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  component: AdminDesk,
});

type Tab = "pipeline" | "ledger" | "expiry";

function AdminDesk() {
  const { user, loading } = useAuth();
  const { data: isAdmin, isLoading: roleLoading, refetch } = useIsAdmin(user?.id);

  if (loading || (user && roleLoading)) {
    return <Shell><p className="text-sm text-muted-foreground">Checking access…</p></Shell>;
  }

  if (!user) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">Admin desk</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This desk is role-gated. Sign in with the admin account to continue.
        </p>
        <Link
          to="/sign-in"
          search={{ redirect: "/admin" }}
          className="mt-6 inline-block rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground"
        >
          Sign in
        </Link>
      </Shell>
    );
  }

  if (!isAdmin) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">No admin access</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Signed in as {user.email}. This account does not hold the admin role. If no admin has
          been set up yet, you can claim it once — after that the desk is locked to that account.
        </p>
        <button
          onClick={async () => {
            const { data, error } = await supabase.rpc("claim_admin");
            if (error || !data) {
              alert("Admin is already claimed by another account.");
              return;
            }
            await refetch();
          }}
          className="mt-6 rounded-full border border-border px-6 py-3 text-sm font-semibold hover:bg-surface"
        >
          Claim admin (first account only)
        </button>
      </Shell>
    );
  }

  return <AdminBoard email={user.email ?? ""} adminId={user.id} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 px-6 py-4">
        <Logo size={28} subtitle="Admin Desk" />
      </header>
      <main className="mx-auto w-full max-w-3xl px-6 py-20">{children}</main>
    </div>
  );
}

function AdminBoard({ email, adminId }: { email: string; adminId: string }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("pipeline");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: venues = [], isLoading } = useQuery({
    queryKey: ["admin-venues"],
    queryFn: fetchAllVenues,
  });

  const pipeline = venues.filter((v) => v.status === "pending");
  const ledger = venues.filter((v) => v.status === "approved");
  const expiring = useMemo(
    () =>
      ledger
        .map((v) => ({ v, days: daysUntil(v.insurance_expiry) }))
        .filter((r) => r.days === null || r.days <= 30)
        .sort((a, b) => (a.days ?? -9999) - (b.days ?? -9999)),
    [ledger],
  );

  const decide = useMutation({
    mutationFn: async (input: {
      id: string;
      status: "approved" | "rejected";
      insurance_expiry?: string | null;
      review_note?: string | null;
    }) => {
      const { error } = await supabase
        .from("venues")
        .update({
          status: input.status,
          insurance_expiry: input.insurance_expiry ?? null,
          insurance_verified_at:
            input.status === "approved" ? new Date().toISOString() : null,
          insurance_verified_by: input.status === "approved" ? adminId : null,
          review_note: input.review_note ?? null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setOpenId(null);
      qc.invalidateQueries({ queryKey: ["admin-venues"] });
      qc.invalidateQueries({ queryKey: ["public-venues"] });
    },
  });

  const rows = tab === "pipeline" ? pipeline : tab === "ledger" ? ledger : expiring.map((e) => e.v);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/85 px-6 py-4 backdrop-blur">
        <Logo size={28} subtitle="Admin Desk" />
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <Link to="/customer" className="hover:text-foreground">Customer map</Link>
          <Link to="/dashboard" className="hover:text-foreground">Partner portal</Link>
          <span className="hidden sm:inline">{email}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="rounded-full border border-border px-3 py-1.5 hover:bg-surface"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-extrabold">Verification desk</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Approval needs one thing: a valid public liability insurance certificate with its expiry
          date recorded. Hygiene ratings are pulled from the FSA feed and pass automatically at 3
          or above.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Stat label="Awaiting verification" value={pipeline.length} tone="warning" />
          <Stat label="Live on the map" value={ledger.length} tone="success" />
          <Stat label="Insurance due ≤30 days" value={expiring.length} tone="brand" />
        </div>

        <nav className="mt-10 flex gap-2 border-b border-border/60 text-sm">
          {(
            [
              ["pipeline", `Onboarding pipeline (${pipeline.length})`],
              ["ledger", `Active ledger (${ledger.length})`],
              ["expiry", `Expiry watch (${expiring.length})`],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-4 py-2.5 font-semibold transition-colors ${
                tab === key
                  ? "border-brand text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading venues…</p>}
          {!isLoading && rows.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">Nothing here right now.</p>
          )}
          {rows.map((v) => (
            <VenueRow
              key={v.id}
              venue={v}
              open={openId === v.id}
              onToggle={() => setOpenId(openId === v.id ? null : v.id)}
              onDecide={(payload) => decide.mutate({ id: v.id, ...payload })}
              saving={decide.isPending}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={`mt-2 text-3xl font-extrabold text-${tone}`}>{value}</p>
    </div>
  );
}

function VenueRow({
  venue,
  open,
  onToggle,
  onDecide,
  saving,
}: {
  venue: Venue;
  open: boolean;
  onToggle: () => void;
  onDecide: (p: {
    status: "approved" | "rejected";
    insurance_expiry?: string | null;
    review_note?: string | null;
  }) => void;
  saving: boolean;
}) {
  const [expiry, setExpiry] = useState(venue.insurance_expiry ?? "");
  const [note, setNote] = useState(venue.review_note ?? "");
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const hygieneOk = (venue.hygiene_rating ?? 0) >= 3;
  const days = daysUntil(venue.insurance_expiry);

  async function viewDoc() {
    if (!venue.insurance_doc_path) return;
    const { data, error } = await supabase.storage
      .from("compliance-docs")
      .createSignedUrl(venue.insurance_doc_path, 300);
    if (error) return alert("Could not open certificate.");
    setDocUrl(data.signedUrl);
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <div className="border-b border-border/60 last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-surface-raised/60"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{venue.name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {venue.category} · {venue.address || "No address"}
          </span>
        </span>
        <span
          className={`hidden rounded-full px-2.5 py-1 text-[10px] font-semibold sm:inline ${
            hygieneOk ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
          }`}
        >
          Hygiene {venue.hygiene_rating ?? "—"}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
            venue.status === "approved"
              ? "bg-success/15 text-success"
              : venue.status === "rejected"
                ? "bg-brand/15 text-brand"
                : "bg-warning/15 text-warning"
          }`}
        >
          {venue.status}
        </span>
        {days !== null && (
          <span className="hidden text-[11px] text-muted-foreground md:inline">
            {days < 0 ? "insurance expired" : `${days}d cover left`}
          </span>
        )}
      </button>

      {open && (
        <div className="grid gap-6 border-t border-border/60 bg-surface-raised/40 px-5 py-5 md:grid-cols-2">
          <div className="space-y-3 text-sm">
            <h3 className="font-semibold">Checks</h3>
            <p className={hygieneOk ? "text-success" : "text-warning"}>
              {hygieneOk
                ? `FSA hygiene ${venue.hygiene_rating} — auto-pass (no manual check needed)`
                : `FSA hygiene ${venue.hygiene_rating ?? "unknown"} — below 3, cannot approve`}
            </p>
            <p className="text-muted-foreground">
              Public liability certificate:{" "}
              {venue.insurance_doc_path ? (
                <button onClick={viewDoc} className="font-semibold text-brand underline">
                  open certificate
                </button>
              ) : (
                <span className="text-warning">not uploaded</span>
              )}
              {docUrl && <span className="ml-2 text-[11px]">(link valid 5 min)</span>}
            </p>
            {venue.website_url && (
              <p className="truncate text-muted-foreground">
                Website:{" "}
                <a href={venue.website_url} target="_blank" rel="noreferrer" className="text-brand">
                  {venue.website_url}
                </a>
              </p>
            )}
            <p className="text-muted-foreground">
              Map position: {venue.lat.toFixed(5)}, {venue.lng.toFixed(5)}
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Insurance expiry date
              <input
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Note
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note for the partner"
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground"
              />
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                disabled={saving || !expiry || !hygieneOk}
                onClick={() =>
                  onDecide({ status: "approved", insurance_expiry: expiry, review_note: note })
                }
                className="rounded-full bg-success px-5 py-2.5 text-sm font-semibold text-success-foreground disabled:opacity-40"
              >
                Verify & approve
              </button>
              <button
                disabled={saving}
                onClick={() => onDecide({ status: "rejected", review_note: note })}
                className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold disabled:opacity-40"
              >
                Reject
              </button>
            </div>
            {!expiry && (
              <p className="text-[11px] text-muted-foreground">
                Enter the certificate expiry date to enable approval.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
