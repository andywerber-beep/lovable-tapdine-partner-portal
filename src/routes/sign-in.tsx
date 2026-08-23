import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero-service.jpg";

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search['redirect'] === "string" ? { redirect: search['redirect'] } : {},
  head: () => ({
    meta: [
      { title: "Partner Sign In — TAPDINE" },
      {
        name: "description",
        content:
          "Sign in to the TAPDINE partner portal to publish offers, add photos, set expiry times and link your menu.",
      },
      { property: "og:title", content: "Partner Sign In — TAPDINE" },
      {
        property: "og:description",
        content: "Access your TAPDINE venue workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [mode, setMode] = useState<"in" | "up">("in");
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
          alt="Coffee shop counter with pastries during a busy morning"
          width={1600}
          height={1104}
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/80 to-brand/20" />
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
              ? "Sign in to your partner workspace or the admin desk."
              : "Ten minutes to onboarding, no setup fee."}
          </p>

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
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand"
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-brand">{error}</p>}
            {notice && <p className="text-sm text-success">{notice}</p>}

            <button
              type="submit"
              disabled={busy}
              className="glow w-full rounded-xl bg-brand py-3.5 text-sm font-semibold text-brand-foreground transition-transform hover:scale-[1.01] disabled:opacity-50"
            >
              {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Register account"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-muted-foreground">
            {mode === "in" ? "New venue?" : "Already a partner?"}{" "}
            <button
              onClick={() => setMode(mode === "in" ? "up" : "in")}
              className="font-semibold text-brand hover:underline"
            >
              {mode === "in" ? "Create an account" : "Sign in"}
            </button>
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
