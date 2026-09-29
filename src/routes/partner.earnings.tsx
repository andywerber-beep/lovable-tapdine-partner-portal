import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TapdineGate, gbp, when } from "@/components/partner/TapdineGate";
import { getEarnings } from "@/lib/passes.functions";

export const Route = createFileRoute("/partner/earnings")({
  head: () => ({
    meta: [
      { title: "Earnings — TapDine Partner Portal" },
      { name: "description", content: "See your TapDine sales, your 90% share and redeemed passes for today, this week and this month." },
      { property: "og:title", content: "Earnings — TapDine Partner Portal" },
      { property: "og:description", content: "Your TapDine sales and payouts at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: () => <TapdineGate title="Earnings">{({ token }) => <Earnings token={token} />}</TapdineGate>,
});

function Earnings({ token }: { token: string }) {
  const fetchEarnings = useServerFn(getEarnings);
  const { data, isLoading, error } = useQuery({
    queryKey: ["tapdine-earnings", token.slice(-12)],
    queryFn: () => fetchEarnings({ data: { token } }),
    refetchInterval: 60_000,
  });
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error || !data) return <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Could not load earnings."}</p>;

  const periods = [
    ["Today", data.totals.today],
    ["This week", data.totals.week],
    ["This month", data.totals.month],
  ] as const;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {periods.map(([label, t]) => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-3xl font-extrabold">{gbp(t.share)}</p>
            <p className="text-xs text-muted-foreground">your 90% share</p>
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Sales</span><span className="font-semibold">{gbp(t.sales)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">TapDine 10%</span><span>{gbp(t.commission)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Passes</span><span>{t.count}</span></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-success/40 bg-success/10 p-5">
          <p className="text-sm text-muted-foreground">Redeemed</p>
          <p className="font-display text-3xl font-extrabold">{data.redeemedCount}</p>
        </div>
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-5">
          <p className="text-sm text-muted-foreground">Not yet redeemed</p>
          <p className="font-display text-3xl font-extrabold">{data.unredeemedCount}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-surface">
        <h2 className="border-b border-border px-5 py-4 text-lg font-bold">Claims</h2>
        {data.claims.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">No paid claims yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.claims.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                <span className="font-mono text-xs tracking-widest text-muted-foreground">{c.claim_code}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{c.offer_title ?? "Offer"}</span>
                <span className="text-xs text-muted-foreground">{when(c.paid_at)}</span>
                <span className="w-20 text-right font-semibold">{gbp(c.total_amount)}</span>
                <span className="w-20 text-right text-success">{gbp(c.share)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.state === "redeemed" ? "bg-success/15 text-success" : c.state === "ready" ? "bg-brand-soft text-brand" : "bg-muted text-muted-foreground"}`}>
                  {c.state === "ready" ? "active" : c.state}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
