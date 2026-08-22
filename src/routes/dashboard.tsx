import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Venue Dashboard Preview — TAPDINE Partner Portal" },
      {
        name: "description",
        content:
          "A preview of the redesigned TAPDINE venue dashboard: live order board, covers, payouts and compliance status at a glance.",
      },
      { property: "og:title", content: "Venue Dashboard Preview — TAPDINE" },
      {
        property: "og:description",
        content: "Live orders, covers, payouts and compliance in one calm workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const nav = ["Overview", "Live orders", "Menu", "Ledger", "Compliance", "Settings"];

const stats = [
  { label: "Covers tonight", value: "68", delta: "+12 vs last Sat" },
  { label: "Gross sales", value: "£2,410", delta: "+8.4%" },
  { label: "Avg. ticket", value: "£35.40", delta: "+£2.10" },
  { label: "Next payout", value: "£1,986", delta: "Tomorrow 09:00" },
];

const orders = [
  { id: "#4821", table: "T4", items: "2× Sea bass, 1× Focaccia", total: "£48.00", state: "Preparing" },
  { id: "#4822", table: "T9", items: "1× Ribeye, 2× Negroni", total: "£62.50", state: "New" },
  { id: "#4823", table: "Bar 2", items: "3× Small plates", total: "£27.00", state: "Ready" },
  { id: "#4824", table: "T1", items: "1× Tasting menu", total: "£85.00", state: "Served" },
];

const stateStyles: Record<string, string> = {
  New: "bg-brand-soft text-brand border-brand/40",
  Preparing: "bg-warning/15 text-warning border-warning/40",
  Ready: "bg-success/15 text-success border-success/40",
  Served: "bg-muted text-muted-foreground border-border",
};

function Dashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar px-5 py-6 lg:flex">
          <Logo size={28} subtitle="Partner Portal" />
          <nav className="mt-10 space-y-1">
            {nav.map((item, i) => (
              <button
                key={item}
                className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${
                  i === 0
                    ? "bg-brand-soft font-semibold text-brand"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
          <Link
            to="/"
            className="mt-auto text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            ← Marketing site
          </Link>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 px-5 py-8 md:px-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Saturday service
              </p>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">The Copper Room</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/15 px-4 py-1.5 text-xs font-semibold text-success">
                <span className="h-2 w-2 rounded-full bg-success" />
                Accepting orders
              </span>
              <button className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-brand-foreground">
                Pause service
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-surface p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {s.label}
                </p>
                <p className="mt-3 font-display text-3xl font-bold">{s.value}</p>
                <p className="mt-1 text-xs text-brand">{s.delta}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <section className="rounded-3xl border border-border bg-surface p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Live order board</h2>
                <span className="text-xs text-muted-foreground">Updated just now</span>
              </div>
              <ul className="mt-5 space-y-3">
                {orders.map((o) => (
                  <li
                    key={o.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface-raised px-4 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {o.id} · {o.table}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{o.items}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold">{o.total}</span>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${stateStyles[o.state]}`}
                      >
                        {o.state}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-3xl border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold">Compliance</h2>
              <ul className="mt-5 space-y-4 text-sm">
                {[
                  ["Identity verified", "Cleared", true],
                  ["Food hygiene rating", "5 — Very good", true],
                  ["Public liability insurance", "Expires 14 Mar", true],
                  ["Payout account", "Action needed", false],
                ].map(([label, value, ok]) => (
                  <li key={label as string} className="flex items-start justify-between gap-4">
                    <span className="text-muted-foreground">{label}</span>
                    <span
                      className={`text-right font-semibold ${ok ? "text-success" : "text-warning"}`}
                    >
                      {value}
                    </span>
                  </li>
                ))}
              </ul>
              <button className="mt-7 w-full rounded-xl border border-border py-3 text-sm font-semibold transition-colors hover:bg-surface-raised">
                Open compliance centre
              </button>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
