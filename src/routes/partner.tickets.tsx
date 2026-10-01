import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { TapdineGate, gbp } from "@/components/partner/TapdineGate";
import { getLiveTickets, markTicketServed, type PassView } from "@/lib/passes.functions";

export const Route = createFileRoute("/partner/tickets")({
  head: () => ({
    meta: [
      { title: "Live Counter — TapDine Partner Portal" },
      { name: "description", content: "Full-screen ticket board for paid TapDine orders, with chime alerts and one-tap Mark Served." },
      { property: "og:title", content: "Live Counter — TapDine Partner Portal" },
      { property: "og:description", content: "See paid orders arrive at the counter and mark them served in one tap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: () => <TapdineGate title="Live counter">{({ token }) => <Board token={token} />}</TapdineGate>,
});

function chime(ctx: AudioContext) {
  [880, 1320].forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = f;
    const t = ctx.currentTime + i * 0.22;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.55);
  });
}

function Board({ token }: { token: string }) {
  const load = useServerFn(getLiveTickets);
  const serve = useServerFn(markTicketServed);
  const [tickets, setTickets] = useState<PassView[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [sound, setSound] = useState<AudioContext | null>(null);
  const seen = useRef<Set<number> | null>(null);
  const hidden = useRef<Set<number>>(new Set());
  const [, tick] = useState(0);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const list = (await load({ data: { token } })).filter((t) => !hidden.current.has(t.id));
        if (!alive) return;
        const fresh = seen.current ? list.some((t) => !seen.current!.has(t.id)) : false;
        seen.current = new Set(list.map((t) => t.id));
        if (fresh && sound) chime(sound);
        setTickets(list);
        setErr(null);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "Connection lost — retrying…");
      }
    };
    run();
    const p = setInterval(run, 4000);
    const c = setInterval(() => tick((n) => n + 1), 1000);
    return () => { alive = false; clearInterval(p); clearInterval(c); };
  }, [token, sound, load]);

  function enableSound() {
    const ctx = new AudioContext();
    chime(ctx);
    setSound(ctx);
  }

  async function served(id: number) {
    hidden.current.add(id);
    setTickets((t) => t.filter((x) => x.id !== id));
    try { await serve({ data: { token, id } }); } catch { hidden.current.delete(id); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {sound ? (
          <Button variant="outline" className="rounded-full" onClick={() => chime(sound)}>Sound on · Test chime</Button>
        ) : (
          <Button className="rounded-full" onClick={enableSound}>Enable sound alerts</Button>
        )}
        <span className="text-sm text-muted-foreground">{tickets.length} waiting · updates every few seconds</span>
        {err && <span className="text-sm text-destructive">{err}</span>}
      </div>

      {tickets.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-10 text-center text-lg text-muted-foreground">
          No orders waiting. New paid orders appear here instantly.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tickets.map((t) => {
            const ms = t.expires_at ? new Date(t.expires_at).getTime() - Date.now() : 0;
            const m = Math.max(0, Math.floor(ms / 60000));
            const s = Math.max(0, Math.floor((ms % 60000) / 1000));
            const urgent = ms < 5 * 60000;
            return (
              <div key={t.id} className={`rounded-2xl border-2 p-5 ${urgent ? "border-warning bg-warning/10" : "border-brand/40 bg-surface"}`}>
                <p className="font-mono text-4xl font-black tracking-widest">{t.claim_code}</p>
                <p className="mt-2 font-display text-xl font-extrabold">{t.offer_title ?? "Offer"}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {gbp(t.total_amount)} · paid {t.paid_at ? new Date(t.paid_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""} ·{" "}
                  <span className={urgent ? "font-bold text-warning" : ""}>{m}:{String(s).padStart(2, "0")} left</span>
                </p>
                <Button onClick={() => served(t.id)} className="mt-4 h-14 w-full rounded-2xl bg-success text-lg font-extrabold text-success-foreground hover:bg-success/90">
                  Mark served
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
