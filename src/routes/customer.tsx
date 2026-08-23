import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav, SiteFooter } from "@/components/brand/SiteNav";

export const Route = createFileRoute("/customer")({
  head: () => ({
    meta: [
      { title: "Customer App Preview — TAPDINE Deal Map" },
      {
        name: "description",
        content:
          "See the TAPDINE customer app: a live map of nearby venues with red pins for registered venues and pulsing green pins for venues running a live offer.",
      },
      { property: "og:title", content: "Customer App Preview — TAPDINE Deal Map" },
      {
        property: "og:description",
        content:
          "Red pins for registered venues, pulsing green pins for live offers, and push pings with expiry countdowns.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomerPreview,
});

type Pin = {
  name: string;
  type: string;
  x: number;
  y: number;
  offer?: string;
  expires?: string;
  distance: string;
};

const pins: Pin[] = [
  {
    name: "The Copper Room",
    type: "Coffee shop",
    x: 32,
    y: 34,
    offer: "10% off the lobster roll",
    expires: "1h 42m left",
    distance: "120m",
  },
  {
    name: "Sesame Deli",
    type: "Sandwich bar",
    x: 66,
    y: 26,
    offer: "Lunch box £6.40",
    expires: "26m left",
    distance: "260m",
  },
  {
    name: "Bramble Café",
    type: "Café",
    x: 52,
    y: 62,
    offer: "Flat white + pastry £4.50",
    expires: "2h 05m left",
    distance: "310m",
  },
  { name: "North Street Grill", type: "Restaurant", x: 20, y: 70, distance: "180m" },
  { name: "Kiln Bakehouse", type: "Bakery", x: 78, y: 58, distance: "340m" },
  { name: "Pier Fish Bar", type: "Restaurant", x: 44, y: 14, distance: "390m" },
];

const offerPins = pins.filter((p) => p.offer);

function MapCanvas() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[oklch(0.22_0.01_240)]">
      {/* streets */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <rect width="100" height="100" fill="oklch(0.24 0.012 250)" />
        {[14, 34, 54, 74, 92].map((y) => (
          <rect key={`h${y}`} x="-5" y={y} width="110" height="2.4" fill="oklch(0.31 0.01 250)" />
        ))}
        {[12, 36, 58, 82].map((x) => (
          <rect key={`v${x}`} x={x} y="-5" width="2" height="110" fill="oklch(0.31 0.01 250)" />
        ))}
        <path d="M-5 78 L40 52 L72 66 L105 44" stroke="oklch(0.34 0.015 250)" strokeWidth="3" fill="none" />
        <rect x="60" y="76" width="26" height="16" fill="oklch(0.29 0.03 150)" rx="1.5" />
        <rect x="4" y="18" width="18" height="12" fill="oklch(0.27 0.02 250)" rx="1.5" />
      </svg>

      {/* user radius */}
      <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand/40 bg-brand/10" />
      <div className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 bg-brand" />
    </div>
  );
}

function MapPin({ pin }: { pin: Pin }) {
  const live = Boolean(pin.offer);
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
    >
      {live && (
        <span className="pin-pulse absolute inset-0 m-auto h-4 w-4 rounded-full bg-success" />
      )}
      <span
        className={`relative block h-4 w-4 rounded-full border-2 border-background shadow-lg ${
          live ? "bg-success" : "bg-brand"
        }`}
        aria-label={`${pin.name}${live ? " — live offer" : ""}`}
      />
      {live && (
        <span className="absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold text-success backdrop-blur">
          {pin.name}
        </span>
      )}
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="glow relative mx-auto w-full max-w-[360px] rounded-[2.6rem] border border-border bg-surface p-3">
      <div className="relative aspect-[9/19] overflow-hidden rounded-[2.1rem] bg-background">
        <div className="absolute left-1/2 top-2 z-30 h-5 w-24 -translate-x-1/2 rounded-full bg-background" />
        {children}
      </div>
    </div>
  );
}

function CustomerPreview() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      <main>
        <section className="mx-auto w-full max-w-6xl px-5 py-16 md:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-success">
            Customer app preview
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1] md:text-6xl">
            Red pins for venues.
            <span className="text-success"> Pulsing green </span>
            when a deal is live.
          </h1>
          <p className="mt-5 max-w-xl text-muted-foreground">
            This is the other half of the ecosystem: the customer opens the map, sees every
            registered venue nearby, and the ones running an offer pulse green until the deal
            expires.
          </p>

          <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:items-start">
            {/* Phone: map */}
            <PhoneFrame>
              <MapCanvas />
              {pins.map((p) => (
                <MapPin key={p.name} pin={p} />
              ))}

              {/* push ping */}
              <div className="ping-in absolute inset-x-3 top-9 z-20 rounded-2xl border border-border/70 bg-surface-raised/95 p-3 backdrop-blur">
                <p className="text-[10px] uppercase tracking-[0.2em] text-success">
                  TAPDINE · now
                </p>
                <p className="mt-1 text-sm font-semibold leading-snug">
                  Sesame Deli · Lunch box £6.40
                </p>
                <p className="text-xs text-muted-foreground">260m away · expires in 26m</p>
              </div>

              {/* bottom sheet */}
              <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl border-t border-border bg-surface/95 px-4 pb-5 pt-3 backdrop-blur">
                <div className="mx-auto h-1 w-10 rounded-full bg-border" />
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {offerPins.length} live offers nearby
                </p>
                <ul className="mt-3 space-y-2">
                  {offerPins.map((o) => (
                    <li
                      key={o.name}
                      className="flex items-center gap-3 rounded-2xl border border-border/70 bg-surface-raised px-3 py-2.5"
                    >
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="pin-pulse absolute inset-0 rounded-full bg-success" />
                        <span className="relative h-2.5 w-2.5 rounded-full bg-success" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">{o.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{o.offer}</p>
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold text-warning">
                        {o.expires}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </PhoneFrame>

            {/* Legend + flow */}
            <div>
              <h2 className="text-2xl font-bold">Map legend</h2>
              <ul className="mt-6 space-y-4 text-sm">
                <li className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-4">
                  <span className="mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-background bg-brand" />
                  <div>
                    <p className="font-semibold">Registered venue</p>
                    <p className="text-muted-foreground">
                      Solid red pin. Tap for opening hours and a link straight to their own website
                      or menu.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4 rounded-2xl border border-success/40 bg-surface p-4">
                  <span className="relative mt-1 flex h-4 w-4 shrink-0">
                    <span className="pin-pulse absolute inset-0 rounded-full bg-success" />
                    <span className="relative h-4 w-4 rounded-full border-2 border-background bg-success" />
                  </span>
                  <div>
                    <p className="font-semibold">Live offer</p>
                    <p className="text-muted-foreground">
                      Pulsing green pin with the venue name. Stops pulsing and reverts to red the
                      moment the offer expires.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-4">
                  <span className="mt-1 h-4 w-4 shrink-0 rounded-full border border-brand/50 bg-brand/20" />
                  <div>
                    <p className="font-semibold">You & your ping radius</p>
                    <p className="text-muted-foreground">
                      Offers published inside the radius trigger a push notification with the
                      remaining time.
                    </p>
                  </div>
                </li>
              </ul>

              <h2 className="mt-12 text-2xl font-bold">How both apps connect</h2>
              <ol className="mt-6 space-y-4 text-sm text-muted-foreground">
                <li>
                  <span className="font-semibold text-foreground">1 · Venue publishes</span> — the
                  partner portal creates an offer with photo, price and expiry.
                </li>
                <li>
                  <span className="font-semibold text-foreground">2 · Pin turns green</span> — the
                  venue's map pin starts pulsing for everyone in range.
                </li>
                <li>
                  <span className="font-semibold text-foreground">3 · Customers get pinged</span> —
                  a push notification lands with the deal and countdown.
                </li>
                <li>
                  <span className="font-semibold text-foreground">4 · Offer expires</span> — the pin
                  reverts to red and the deal drops off the list automatically.
                </li>
              </ol>

              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  to="/dashboard"
                  className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition-transform hover:scale-[1.03]"
                >
                  See the partner portal
                </Link>
                <Link
                  to="/"
                  className="rounded-full border border-border px-6 py-3 text-sm font-semibold transition-colors hover:bg-surface"
                >
                  Back to landing
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
