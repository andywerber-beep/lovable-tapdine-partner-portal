import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav, SiteFooter } from "@/components/brand/SiteNav";
import heroImg from "@/assets/partner-cafe.jpg";
import phoneImg from "@/assets/tap-phone.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TapDine — Send Your Offer to People Nearby" },
      {
        name: "description",
        content:
          "TapDine pings nearby customers with your time-limited offers. Cafés, coffee shops, sandwich bars and restaurants publish deals with photos in minutes.",
      },
      { property: "og:title", content: "TapDine — Send Your Offer to People Nearby" },
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
  { n: "1", title: "Snap & post a deal", body: "Take a photo of the real dish, set a price and how long it runs. Takes a minute." },
  { n: "2", title: "Light up the map", body: "While your offer is live, your pin glows and people nearby get pinged." },
  { n: "3", title: "Serve from the counter", body: "Paid orders chime on your Live Counter screen. One tap to mark served." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main>
        <section className="relative overflow-hidden">
          <img src={heroImg} alt="Barista serving coffee and a sandwich at a sunny café" width={1600} height={1104} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/85 to-background/20" />
          <div className="relative mx-auto w-full max-w-6xl px-5 py-12 md:py-20">
            <span className="inline-flex rounded-full bg-secondary px-4 py-1.5 text-xs font-extrabold uppercase text-secondary-foreground">
              Founding partners: 0% commission for 3 months
            </span>
            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight md:text-6xl">Turn quiet hours into busy ones.</h1>
            <p className="mt-4 max-w-lg text-lg font-semibold">
              Post a deal with a photo and TapDine pings hungry people walking nearby — straight to your counter.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/sign-in" search={{ signup: true }} className="glow rounded-full bg-brand px-7 py-3.5 text-base font-bold text-brand-foreground transition-transform hover:scale-[1.03]">
                Start with 0% commission
              </Link>
              <span className="text-sm font-semibold text-muted-foreground">Then a flat 10% · £0 monthly fees · no hidden costs</span>
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto w-full max-w-6xl px-5 py-14">
          <h2 className="text-3xl font-bold md:text-4xl">How it works</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="rounded-2xl border border-border bg-surface p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-black text-brand-foreground">{s.n}</span>
                <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
          <p id="value" className="mt-6 text-sm text-muted-foreground">
            You only appear on the customer map while you have a live offer — so every view is someone who can buy right now.
          </p>
        </section>

        <section id="pricing" className="mx-auto w-full max-w-6xl px-5 pb-16">
          <div className="grid items-center gap-8 rounded-3xl bg-accent/50 p-6 md:grid-cols-[1.3fr_1fr] md:p-10">
            <div>
              <h2 className="text-3xl font-bold">Simple pricing</h2>
              <ul className="mt-4 space-y-2 text-base font-semibold">
                <li>0% commission for your first 3 months</li>
                <li>Flat 10% per sale after that</li>
                <li>No monthly fees, no hidden costs</li>
              </ul>
              <Link to="/sign-in" search={{ signup: true }} className="mt-6 inline-block rounded-full bg-brand px-7 py-3.5 font-bold text-brand-foreground transition-transform hover:scale-[1.03]">
                Create your partner account
              </Link>
            </div>
            <img src={phoneImg} alt="Customer receiving a TapDine offer ping on their phone" loading="lazy" width={1200} height={912} className="w-full rounded-2xl object-cover" />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
