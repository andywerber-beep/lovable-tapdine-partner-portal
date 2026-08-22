import { createFileRoute } from "@tanstack/react-router";
import { SiteNav, SiteFooter } from "@/components/brand/SiteNav";
import mark from "@/assets/tapdine-mark.png";

export const Route = createFileRoute("/brand")({
  head: () => ({
    meta: [
      { title: "TAPDINE Brand System — Logo, Colour, Type" },
      {
        name: "description",
        content:
          "The TAPDINE brand system: logo usage, colour tokens, typography scale and core UI components for the partner portal.",
      },
      { property: "og:title", content: "TAPDINE Brand System" },
      {
        property: "og:description",
        content: "Logo, colour tokens, typography and component styles for TAPDINE.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Brand,
});

const swatches = [
  ["Coral (brand)", "bg-brand", "Primary actions, accents, active state"],
  ["Ember", "bg-ember", "Secondary highlight, charts, warm data"],
  ["Charcoal (bg)", "bg-background", "Page background"],
  ["Surface", "bg-surface", "Cards and panels"],
  ["Surface raised", "bg-surface-raised", "Rows, nested cards"],
  ["Success", "bg-success", "Verified, ready, live"],
  ["Warning", "bg-warning", "Pending, expiring"],
  ["Destructive", "bg-destructive", "Errors, destructive actions"],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border/60 py-14">
      <h2 className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{title}</h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Brand() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto w-full max-w-5xl px-5 pb-16">
        <div className="py-20">
          <h1 className="text-5xl font-bold md:text-6xl">Brand system</h1>
          <p className="mt-5 max-w-xl text-muted-foreground">
            One coral accent, deep charcoal surfaces, warm neutral text. Confident display
            type for headlines, quiet grotesk for everything else.
          </p>
        </div>

        <Section title="Logo">
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="flex items-center justify-center rounded-3xl border border-border bg-surface p-10">
              <img src={mark} alt="TAPDINE mark" width={96} height={96} loading="lazy" />
            </div>
            <div className="flex items-center justify-center gap-3 rounded-3xl border border-border bg-surface p-10">
              <img src={mark} alt="TAPDINE mark small" width={36} height={36} loading="lazy" />
              <span className="font-display text-xl font-extrabold tracking-[0.2em]">
                TAPDINE
              </span>
            </div>
            <div className="flex items-center justify-center gap-3 rounded-3xl border border-border bg-cream p-10">
              <img src={mark} alt="TAPDINE mark on light" width={36} height={36} loading="lazy" />
              <span className="font-display text-xl font-extrabold tracking-[0.2em] text-background">
                TAPDINE
              </span>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            The mark is a tap ripple resolving into a plate. Keep clear space of one ripple
            width; never recolour it outside coral, cream or charcoal.
          </p>
        </Section>

        <Section title="Colour">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {swatches.map(([name, cls, use]) => (
              <div key={name} className="rounded-2xl border border-border bg-surface p-4">
                <div className={`h-16 w-full rounded-xl border border-border ${cls}`} />
                <p className="mt-3 text-sm font-semibold">{name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{use}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Typography">
          <div className="space-y-6 rounded-3xl border border-border bg-surface p-8">
            <p className="font-display text-5xl font-extrabold">Display / Bricolage Grotesque</p>
            <p className="font-display text-3xl font-bold">Heading 2 — service starts at six</p>
            <p className="text-lg">Body / Manrope — readable at speed on a busy pass.</p>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Label · uppercase · 0.24em tracking
            </p>
          </div>
        </Section>

        <Section title="Components">
          <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-border bg-surface p-8">
            <button className="glow rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground">
              Primary action
            </button>
            <button className="rounded-full border border-border px-6 py-3 text-sm font-semibold">
              Secondary
            </button>
            <span className="rounded-full border border-success/40 bg-success/15 px-4 py-1.5 text-xs font-semibold text-success">
              Live
            </span>
            <span className="rounded-full border border-warning/40 bg-warning/15 px-4 py-1.5 text-xs font-semibold text-warning">
              Pending
            </span>
            <input
              placeholder="Input field"
              className="rounded-xl border border-input bg-surface-raised px-4 py-3 text-sm outline-none focus:border-brand"
            />
          </div>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
