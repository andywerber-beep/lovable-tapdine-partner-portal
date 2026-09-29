import { useEffect, useState, type ReactNode } from "react";
import { type SupabaseClient, type Session } from "@supabase/supabase-js";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { getTapdineAuthConfig, getMyTapdineVenue } from "@/lib/passes.functions";
import { getTapdineClient } from "@/lib/tapdine-auth";
import { CompliancePending, type ComplianceVenue } from "@/components/partner/CompliancePending";

function useTapdineClient() {
  const loadConfig = useServerFn(getTapdineAuthConfig);
  const [c, setC] = useState<SupabaseClient | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    getTapdineClient(loadConfig)
      .then(setC)
      .catch(() => setErr("Could not reach the TapDine database."));
  }, [loadConfig]);
  return { client: c, err };
}

export type GateCtx = { token: string; venueName: string | null };

export function TapdineGate({ title, children }: { title: string; children: (ctx: GateCtx) => ReactNode }) {
  const { client: sb, err } = useTapdineClient();
  const loadVenue = useServerFn(getMyTapdineVenue);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [venue, setVenue] = useState<(ComplianceVenue & { status: string | null }) | null>(null);
  const venueName = venue?.name ?? null;
  const [venueErr, setVenueErr] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [sb]);

  useEffect(() => {
    if (!session) return;
    setVenueErr(null);
    loadVenue({ data: { token: session.access_token } })
      .then((v) => setVenue(v))
      .catch((e) => setVenueErr(e instanceof Error ? e.message : "Could not load your venue."));
  }, [session?.access_token, loadVenue, reload]);

  const isLive = venue && ["active", "approved", "live"].includes(venue.status ?? "");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-border/60 bg-background/85 px-6 py-4 backdrop-blur">
        <Logo size={28} subtitle="Partner Portal" />
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/partner/redeem" className="rounded-full px-3 py-1.5 font-semibold hover:bg-brand-soft" activeProps={{ className: "bg-brand-soft text-brand" }}>
            Redeem
          </Link>
          <Link to="/partner/earnings" className="rounded-full px-3 py-1.5 font-semibold hover:bg-brand-soft" activeProps={{ className: "bg-brand-soft text-brand" }}>
            Earnings
          </Link>
          {session && sb && (
            <Button variant="outline" className="rounded-full" onClick={() => sb.auth.signOut()}>
              Sign out
            </Button>
          )}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <h1 className="font-display text-3xl font-extrabold">{title}</h1>
        {venueName && <p className="mt-1 text-sm text-muted-foreground">{venueName}</p>}
        <div className="mt-8">
          {err ? (
            <p className="text-sm text-destructive">{err}</p>
          ) : !ready || !sb ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !session ? (
            <SignInForm sb={sb} />
          ) : venueErr ? (
            <p className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">{venueErr}</p>
          ) : !venue ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !isLive ? (
            <CompliancePending venue={venue} token={session.access_token} onDone={() => setReload((n) => n + 1)} onSignOut={() => sb.auth.signOut()} />
          ) : (
            children({ token: session.access_token, venueName })
          )}
        </div>
      </main>
    </div>
  );
}

function SignInForm({ sb }: { sb: SupabaseClient }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="max-w-sm space-y-4 rounded-2xl border border-border bg-surface p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        setBusy(false);
        if (error) setMsg("Those details didn't match. Use your TapDine venue login.");
      }}
    >
      <p className="text-sm text-muted-foreground">Sign in with the email and password you registered your venue with.</p>
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-brand focus:outline-none" />
      <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-brand focus:outline-none" />
      <Button type="submit" disabled={busy} className="w-full rounded-full">{busy ? "Signing in…" : "Sign in"}</Button>
      {msg && <p className="text-xs text-destructive">{msg}</p>}
    </form>
  );
}

export const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
export const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";
