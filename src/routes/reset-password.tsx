import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { getTapdineClient } from "@/lib/tapdine-auth";
import { getTapdineAuthConfig } from "@/lib/passes.functions";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — TapDine Partners" },
      { name: "description", content: "Set a new password for your TapDine venue account." },
      { property: "og:title", content: "Choose a new password — TapDine Partners" },
      { property: "og:description", content: "Finish resetting your TapDine partner password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

type Phase = "checking" | "ready" | "invalid" | "done";

function ResetPassword() {
  const navigate = useNavigate();
  const loadConfig = useServerFn(getTapdineAuthConfig);
  const [phase, setPhase] = useState<Phase>("checking");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    if (hash.get("error") || query.get("error")) {
      setPhase("invalid");
      return;
    }
    const isRecovery = hash.get("type") === "recovery" || query.has("code");
    (async () => {
      const sb = await getTapdineClient(loadConfig);
      const code = query.get("code");
      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (error && !cancelled) return setPhase("invalid");
      }
      // Give the client a moment to read the recovery token from the link.
      for (let i = 0; i < 20 && !cancelled; i++) {
        const { data } = await sb.auth.getSession();
        if (data.session && isRecovery) {
          window.history.replaceState(null, "", "/reset-password");
          return setPhase("ready");
        }
        await new Promise((r) => setTimeout(r, 150));
      }
      if (!cancelled) setPhase("invalid");
    })();
    return () => {
      cancelled = true;
    };
  }, [loadConfig]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) return setError("Use at least 8 characters.");
    if (pw !== pw2) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      const sb = await getTapdineClient(loadConfig);
      const { error } = await sb.auth.updateUser({ password: pw });
      if (error) {
        if (/session|expired|jwt/i.test(error.message)) setPhase("invalid");
        else setError(error.message);
        return;
      }
      await sb.auth.signOut();
      setPhase("done");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-xl border border-input bg-surface px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-brand";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-14">
      <div className="w-full max-w-sm">
        <Logo size={30} subtitle="Partner Portal" />
        {phase === "checking" && <p className="mt-10 text-sm text-muted-foreground">Checking your link…</p>}

        {phase === "invalid" && (
          <>
            <h1 className="mt-10 text-3xl font-bold">This link has expired</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Reset links only work once and for a limited time. Request a fresh one below.
            </p>
            <Button asChild className="glow mt-8 h-12 w-full rounded-lg text-sm font-bold">
              <Link to="/forgot-password">Send me a new link</Link>
            </Button>
          </>
        )}

        {phase === "ready" && (
          <>
            <h1 className="mt-10 text-3xl font-bold">Choose a new password</h1>
            <form className="mt-8 space-y-5" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label htmlFor="pw" className="text-sm font-medium text-muted-foreground">New password</label>
                <input id="pw" type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} className={input} />
              </div>
              <div className="space-y-2">
                <label htmlFor="pw2" className="text-sm font-medium text-muted-foreground">Confirm new password</label>
                <input id="pw2" type="password" required minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} className={input} />
              </div>
              {error && <p className="text-sm text-brand">{error}</p>}
              <Button type="submit" disabled={busy} className="glow h-12 w-full rounded-lg text-sm font-bold">
                {busy ? "Saving…" : "Save new password"}
              </Button>
            </form>
          </>
        )}

        {phase === "done" && (
          <>
            <h1 className="mt-10 text-3xl font-bold">Password updated</h1>
            <p className="mt-2 text-sm text-muted-foreground">Sign in with your new password.</p>
            <Button onClick={() => navigate({ to: "/sign-in" })} className="glow mt-8 h-12 w-full rounded-lg text-sm font-bold">
              Go to sign in
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
