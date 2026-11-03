import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { getTapdineClient } from "@/lib/tapdine-auth";
import { getTapdineAuthConfig } from "@/lib/passes.functions";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — TapDine Partners" },
      { name: "description", content: "Request a password reset link for your TapDine venue account." },
      { property: "og:title", content: "Reset your password — TapDine Partners" },
      { property: "og:description", content: "Get back into your TapDine partner workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPassword,
});

export function ForgotPassword() {
  const loadConfig = useServerFn(getTapdineAuthConfig);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const sb = await getTapdineClient(loadConfig);
      // Result is intentionally ignored so we never reveal whether an account exists.
      await sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      /* neutral */
    } finally {
      setBusy(false);
      setSent(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-14">
      <div className="w-full max-w-sm">
        <Logo size={30} subtitle="Partner Portal" />
        <h1 className="mt-10 text-3xl font-bold">Forgot your password?</h1>
        {sent ? (
          <div className="mt-6 rounded-lg border border-brand/25 bg-brand-soft p-5 text-sm text-foreground">
            If an account exists for that email, we've sent a link to reset your password. Check your
            inbox (and spam folder). The link works once and expires after a short time.
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter the email you registered your venue with and we'll send you a reset link.
            </p>
            <form className="mt-8 space-y-5" onSubmit={onSubmit}>
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
                  className="w-full rounded-xl border border-input bg-surface px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-brand"
                />
              </div>
              <Button type="submit" disabled={busy} className="glow h-12 w-full rounded-lg text-sm font-bold">
                {busy ? "Please wait…" : "Send reset link"}
              </Button>
            </form>
          </>
        )}
        <Link to="/sign-in" className="mt-8 block text-center text-sm font-semibold text-brand hover:underline">
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
