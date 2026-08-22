import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav, SiteFooter } from "@/components/brand/SiteNav";
import heroImg from "@/assets/hero-service.jpg";
import phoneImg from "@/assets/tap-phone.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TAPDINE — Fill Empty Tables, Tonight" },
      {
        name: "description",
        content:
          "TAPDINE connects nearby diners with your venue in real time. Join the partner network, manage menus, orders and payouts from one portal.",
      },
      { property: "og:title", content: "TAPDINE — Fill Empty Tables, Tonight" },
      {
        property: "og:description",
        content:
          "Real-time diner discovery for restaurants. Onboard in minutes and run service from the TAPDINE partner portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const steps = [
  {
    n: "01",
    title: "Create your venue account",
    body: "Sign up with your venue email and we open a partner workspace instantly.",
  },
  {
    n: "02",
    title: "Verify once, trade forever",
    body: "Upload ID, hygiene rating and insurance. Automated checks clear most venues same-day.",
  },
  {
    n: "03",
    title: "Publish your menu",
    body: "Build menus with photos, modifiers and live availability toggles.",
  },
  {
    n: "04",
    title: "Go live and get tapped",
    body: "Diners nearby get a proximity ping. Orders land on your live board with payouts tracked.",
  },
];

const values = [
  {
    title: "Proximity demand",
    body: "We ping hungry people within walking distance the moment you have covers to fill.",
    stat: "≤ 400m",
    label: "Average ping radius",
  },
  {
    title: "No dead paperwork",
    body: "Hygiene, insurance and identity checks are read automatically, not chased over email.",
    stat: "Same day",
    label: "Typical verification",
  },
  {
    title: "Money you can see",
    body: "A running ledger of every order, fee and payout — reconciled without a spreadsheet.",
    stat: "Daily",
    label: "Payout cadence",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <img
            src={heroImg}
            alt="Chef plating dishes on a restaurant pass during service"
            width={1600}
            height={1104}
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
          <div className="relative mx-auto w-full max-w-6xl px-5 py-24 md:py-36">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-brand">
              Partner network
            </span>
            <h1 className="mt-7 max-w-3xl text-5xl font-extrabold leading-[0.95] md:text-7xl">
              Fill the tables you
              <span className="text-brand"> already </span>
              have.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              TAPDINE puts your venue in front of diners standing minutes away — then runs
              the whole service from one calm partner portal.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/sign-in"
                className="glow rounded-full bg-brand px-7 py-3.5 text-base font-semibold text-brand-foreground transition-transform hover:scale-[1.03]"
              >
                Become a partner
              </Link>
              <Link
                to="/dashboard"
                className="rounded-full border border-border px-7 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-surface"
              >
                See the portal
              </Link>
            </div>
            <dl className="mt-16 grid max-w-2xl grid-cols-2 gap-8 border-t border-border/60 pt-8 sm:grid-cols-3">
              {[
                ["2,400+", "Diners pinged nightly"],
                ["18 min", "Median first order"],
                ["0%", "Setup fee"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="font-display text-3xl font-bold text-foreground">{v}</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Value */}
        <section id="value" className="mx-auto w-full max-w-6xl px-5 py-24">
          <h2 className="max-w-2xl text-4xl font-bold md:text-5xl">
            Built for the hour before the rush.
          </h2>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {values.map((v) => (
              <article
                key={v.title}
                className="rounded-3xl border border-border bg-surface p-7 transition-colors hover:border-brand/50"
              >
                <p className="font-display text-4xl font-bold text-brand">{v.stat}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {v.label}
                </p>
                <h3 className="mt-7 text-xl font-semibold">{v.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-y border-border/60 bg-surface/40">
          <div className="mx-auto grid w-full max-w-6xl gap-14 px-5 py-24 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-4xl font-bold md:text-5xl">From signup to service</h2>
              <p className="mt-4 max-w-md text-muted-foreground">
                Four steps, no sales call, no integration project.
              </p>
              <ol className="mt-10 space-y-8">
                {steps.map((s) => (
                  <li key={s.n} className="flex gap-5">
                    <span className="mt-0.5 font-display text-sm font-bold tracking-widest text-brand">
                      {s.n}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold">{s.title}</h3>
                      <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <img
              src={phoneImg}
              alt="Diner receiving a TAPDINE proximity ping at a restaurant table"
              loading="lazy"
              width={1200}
              height={912}
              className="glow w-full rounded-3xl border border-border object-cover"
            />
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-6xl px-5 py-28 text-center">
          <h2 className="mx-auto max-w-2xl text-4xl font-bold md:text-6xl">
            Your next full house starts with a tap.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-muted-foreground">
            Join venues already trading on TAPDINE. Onboarding takes about ten minutes.
          </p>
          <Link
            to="/sign-in"
            className="glow mt-10 inline-block rounded-full bg-brand px-9 py-4 text-base font-semibold text-brand-foreground transition-transform hover:scale-[1.03]"
          >
            Create your partner account
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
