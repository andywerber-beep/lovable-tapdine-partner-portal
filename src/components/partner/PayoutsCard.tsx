import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { createStripeConnectOnboarding, createStripeDashboardLink, getStripeAccountStatus } from "@/lib/stripe-connect.functions";

export function PayoutsCard({ token }: { token: string }) {
  const status = useServerFn(getStripeAccountStatus);
  const onboard = useServerFn(createStripeConnectOnboarding);
  const dash = useServerFn(createStripeDashboardLink);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [returned, setReturned] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const s = p.get("stripe");
    if (s) {
      setReturned(s === "return");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["stripe-status"],
    queryFn: () => status({ data: { token } }),
    retry: false,
  });

  async function go(kind: "onboard" | "dash") {
    setBusy(true); setErr(null);
    try {
      const r = kind === "onboard"
        ? await onboard({ data: { token, origin: window.location.origin } })
        : await dash({ data: { token } });
      window.location.href = r.url;
    } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); setBusy(false); }
  }

  if (isLoading) return null;
  if (error) return <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">{(error as Error).message}</p>;

  const active = data?.chargesEnabled && data?.payoutsEnabled;
  if (active) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-success/40 bg-success/10 p-4">
        <div className="flex-1">
          <p className="font-display text-lg font-extrabold">Payouts active</p>
          <p className="text-sm text-muted-foreground">{returned ? "All set! " : ""}Customer payments go straight to your bank account.</p>
        </div>
        <Button variant="outline" className="rounded-full" disabled={busy} onClick={() => go("dash")}>View payouts</Button>
        {err && <p className="w-full text-sm text-destructive">{err}</p>}
      </div>
    );
  }

  const pending = data?.connected;
  return (
    <div className={`rounded-2xl border p-5 ${pending ? "border-warning/40 bg-warning/10" : "border-brand/40 bg-brand-soft"}`}>
      <p className="font-display text-xl font-extrabold">{pending ? "Finish your payout setup" : "Connect Bank & Set Up Payouts"}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {pending
          ? data?.detailsSubmitted
            ? "Stripe is checking your details — this usually takes a few minutes. You can come back to add anything missing."
            : "Stripe still needs a few details before you can take payments."
          : "Before diners can buy your offers, connect your UK bank account through Stripe, our secure payments partner. It takes about 5 minutes."}
      </p>
      <Button className="mt-4 h-11 rounded-full px-6 font-extrabold" disabled={busy} onClick={() => go("onboard")}>
        {busy ? "Opening Stripe…" : pending ? "Complete payout setup" : "Connect Bank & Set Up Payouts"}
      </Button>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
    </div>
  );
}
