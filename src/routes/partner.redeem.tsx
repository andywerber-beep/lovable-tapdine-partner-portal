import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { TapdineGate, gbp, when } from "@/components/partner/TapdineGate";
import { lookupPass, redeemPass, type PassView } from "@/lib/passes.functions";

export const Route = createFileRoute("/partner/redeem")({
  head: () => ({
    meta: [
      { title: "Redeem a Pass — TapDine Partner Portal" },
      { name: "description", content: "Check a customer's TapDine pass code and redeem it at the counter." },
      { property: "og:title", content: "Redeem a Pass — TapDine Partner Portal" },
      { property: "og:description", content: "Type in a pass code, check it's valid, and redeem it in one tap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: () => <TapdineGate title="Redeem a pass">{({ token }) => <Redeem token={token} />}</TapdineGate>,
});

function Countdown({ until }: { until: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return <span>expired</span>;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return <span>{m}:{String(s).padStart(2, "0")} left</span>;
}

function Redeem({ token }: { token: string }) {
  const look = useServerFn(lookupPass);
  const redeem = useServerFn(redeemPass);
  const [code, setCode] = useState("");
  const [pass, setPass] = useState<PassView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function check(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setDone(false);
    setError(null);
    try {
      const r = await look({ data: { token, code: code.trim() } });
      setPass(r.pass);
      setError(r.error);
    } catch (err) {
      setPass(null);
      setError(err instanceof Error ? err.message : "Could not check that code.");
    }
    setBusy(false);
  }

  async function doRedeem() {
    setBusy(true);
    try {
      const r = await redeem({ data: { token, code: pass!.claim_code } });
      if (r.pass) setPass(r.pass);
      setError(r.error);
      setDone(!r.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not redeem.");
    }
    setBusy(false);
  }

  const tone =
    pass?.state === "ready"
      ? "border-success/40 bg-success/10"
      : pass?.state === "redeemed" && done
        ? "border-success/40 bg-success/10"
        : "border-destructive/40 bg-destructive/10";

  return (
    <div className="space-y-6">
      <form onSubmit={check} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="MALT-4821"
          autoFocus
          className="flex-1 rounded-2xl border border-border bg-surface px-5 py-4 font-mono text-2xl tracking-widest focus:border-brand focus:outline-none"
        />
        <Button type="submit" disabled={busy || code.trim().length < 3} className="h-auto rounded-2xl px-8 py-4 text-base">
          Check code
        </Button>
      </form>

      {error && !pass && <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-semibold">{error}</p>}

      {pass && (
        <div className={`rounded-2xl border p-6 ${tone}`}>
          <p className="font-mono text-sm tracking-widest text-muted-foreground">{pass.claim_code}</p>
          <p className="mt-2 font-display text-2xl font-extrabold">{pass.offer_title ?? "Offer"}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-muted-foreground">Paid</dt><dd className="text-lg font-bold">{gbp(pass.total_amount)}</dd></div>
            <div><dt className="text-muted-foreground">Paid at</dt><dd className="font-semibold">{when(pass.paid_at)}</dd></div>
            <div>
              <dt className="text-muted-foreground">30-minute window</dt>
              <dd className="font-semibold">
                {pass.state === "redeemed" ? `Redeemed ${when(pass.redeemed_at)}` : pass.state === "expired" ? "Expired" : pass.expires_at ? <>Valid · <Countdown until={pass.expires_at} /></> : "Not paid"}
              </dd>
            </div>
          </dl>
          {error && <p className="mt-4 text-sm font-semibold text-destructive">{error}</p>}
          {done && <p className="mt-4 text-lg font-bold text-success">Redeemed — enjoy serving!</p>}
          {pass.state === "ready" && (
            <Button onClick={doRedeem} disabled={busy} className="mt-6 h-16 w-full rounded-2xl bg-success text-xl font-extrabold text-success-foreground hover:bg-success/90">
              {busy ? "Redeeming…" : "Redeem"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
