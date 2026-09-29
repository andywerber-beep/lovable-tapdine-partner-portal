import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Logo } from "@/components/brand/Logo";
import heroImg from "@/assets/partner-cafe.jpg";
import { Button } from "@/components/ui/button";
import { getTapdineClient } from "@/lib/tapdine-auth";
import { getTapdineAuthConfig, registerTapdinePartner } from "@/lib/passes.functions";

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string; signup?: boolean } => ({
    ...(typeof search['redirect'] === "string" ? { redirect: search['redirect'] } : {}),
    ...(search['signup'] === true ? { signup: true } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Partner Sign In — TapDine" },
      {
        name: "description",
        content:
          "Sign in to the TapDine partner portal to publish offers, add photos, set expiry times and link your menu.",
      },
      { property: "og:title", content: "Partner Sign In — TapDine" },
      {
        property: "og:description",
        content: "Access your TapDine venue workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const { redirect, signup } = Route.useSearch();
  const [mode, setMode] = useState<"in" | "up">(signup ? "up" : "in");
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: (redirect as "/dashboard") ?? "/dashboard" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        setNotice("Account created. Check your inbox to confirm, then sign in.");
        setMode("in");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src={heroImg}
          alt="Friendly barista serving coffee and lunch at a sunny café"
          width={1600}
          height={1104}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/25 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo size={32} subtitle="Partner Portal" />
          <div>
            <h2 className="max-w-md text-5xl font-bold leading-[1.02]">
              One offer. Everyone nearby.
            </h2>
            <p className="mt-5 max-w-sm text-muted-foreground">
              Publish a deal with a photo, set how long it runs, and link your menu — the pings do
              the rest.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-14">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Logo size={30} subtitle="Partner Portal" />
          </div>

          <h1 className="mt-10 text-3xl font-bold lg:mt-0">
            {mode === "in" ? "Welcome back" : "Create your venue account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "in"
              ? "Sign in to your partner workspace."
              : "Join TapDine as a founding partner."}
          </p>
          {mode === "up" && (
            <div className="mt-6 rounded-lg border border-brand/25 bg-brand-soft p-5">
              <p className="font-display text-lg font-extrabold text-foreground">0% commission for your first 3 months</p>
              <p className="mt-1 text-sm text-muted-foreground">Then a flat 10% commission. No monthly fees or hidden costs.</p>
            </div>
          )}

          <form className="mt-9 space-y-5" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="venue@example.com"
                className="w-full rounded-xl border border-input bg-surface px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brand"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="pw" className="text-sm font-medium text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  id="pw"
                  type={show ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-input bg-surface px-4 py-3 pr-16 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brand"
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShow(!show)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand"
                >
                  {show ? "Hide" : "Show"}
                </Button>
              </div>
            </div>

            {error && <p className="text-sm text-brand">{error}</p>}
            {notice && <p className="text-sm text-success">{notice}</p>}

            <Button
              type="submit"
              disabled={busy}
              className="glow h-12 w-full rounded-lg text-sm font-bold"
            >
              {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Register account"}
            </Button>
          </form>

          <p className="mt-7 text-center text-sm text-muted-foreground">
            {mode === "in" ? "New venue?" : "Already a partner?"}{" "}
            <Button
              variant="link"
              onClick={() => setMode(mode === "in" ? "up" : "in")}
              className="h-auto p-0 font-bold text-brand"
            >
              {mode === "in" ? "Create an account" : "Sign in"}
            </Button>
          </p>

          <Link
            to="/"
            className="mt-10 block text-center text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            ← Back to site
          </Link>
        </div>
      </div>
    </div>
  );
}
