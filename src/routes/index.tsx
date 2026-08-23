import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav, SiteFooter } from "@/components/brand/SiteNav";
import heroImg from "@/assets/hero-service.jpg";
import phoneImg from "@/assets/tap-phone.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TAPDINE — Send Your Offer to People Nearby" },
      {
        name: "description",
        content:
          "TAPDINE pings nearby customers with your time-limited offers. Cafés, coffee shops, sandwich bars and restaurants publish deals with photos in minutes.",
      },
      { property: "og:title", content: "TAPDINE — Send Your Offer to People Nearby" },
      {
        property: "og:description",
        content:
          "Proximity deal pings for local venues. Publish an offer with a photo, set an expiry, and reach customers walking past.",
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
    body: "Coffee shop, café, sandwich bar, deli or restaurant — sign up and your workspace opens instantly.",
  },
  {
    n: "02",
    title: "Add your venue details",
    body: "Location, opening hours and a link to your own website or menu so customers can browse.",
  },
  {
    n: "03",
    title: "Publish an offer",
    body: "“10% off the lobster roll.” Add a photo, set a price and choose how long it stays live.",
  },
  {
    n: "04",
    title: "Nearby customers get pinged",
    body: "Anyone in range sees your deal on the map and gets a notification while it's still valid.",
  },
];

const values = [
  {
    title: "Proximity pings",
    body: "People walking within a few streets of you get your offer the moment you publish it.",
    stat: "≤ 400m",
    label: "Typical ping radius",
  },
  {
    title: "Offers that expire",
    body: "Set a window — two hours, one afternoon — and the deal retires itself. No stale vouchers.",
    stat: "2 hrs",
    label: "Common offer window",
  },
  {
    title: "Your menu, your site",
    body: "Link your own website or menu so customers browse you properly before they walk in.",
    stat: "1 link",
    label: "Straight to your menu",
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
            alt="Barista handing over a coffee and sandwich at a local counter"
            width={1600}
            height={1104}
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
          <div className="relative mx-auto w-full max-w-6xl px-5 py-24 md:py-36">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-brand">
              Venue partner network
            </span>
            <h1 className="mt-7 max-w-3xl text-5xl font-extrabold leading-[0.95] md:text-7xl">
              Your offer, in the
              <span className="text-brand"> pocket </span>
              of everyone nearby.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Cafés, coffee shops, sandwich bars and restaurants publish a time-limited deal —
              TAPDINE pings the customers walking past before it expires.
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
                ["2,400+", "Customers pinged daily"],
                ["2 hrs", "Typical offer window"],
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
