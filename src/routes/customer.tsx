import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/components/brand/Logo";
import {
  fetchPublicVenues,
  timeLeft,
  distanceMeters,
  formatDistance,
  type VenueWithOffers,
} from "@/lib/tapdine";

const VenueMap = lazy(() => import("@/components/map/VenueMap"));

export const Route = createFileRoute("/customer")({
  head: () => ({
    meta: [
      { title: "Customer App — TAPDINE Live Deal Map" },
      {
        name: "description",
        content:
          "The TAPDINE customer app: a live map of nearby venues with red pins for registered venues and pulsing green pins for venues running a time-limited offer.",
      },
      { property: "og:title", content: "Customer App — TAPDINE Live Deal Map" },
      {
        property: "og:description",
        content:
          "Red pins for registered venues, pulsing green pins for live offers, push pings with expiry countdowns.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomerApp,
});

const DEFAULT_CENTER: [number, number] = [51.5155, -0.1225];

function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface text-xs text-muted-foreground">
      Loading map…
    </div>
  );
}

function CustomerApp() {
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [selected, setSelected] = useState<string | null>(null);
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
      () => undefined,
      { enableHighAccuracy: true, timeout: 6000 },
    );
  }, []);

  const { data: venues = [], isLoading } = useQuery({
    queryKey: ["public-venues"],
    queryFn: fetchPublicVenues,
    refetchInterval: 60_000,
  });

  const withDistance = useMemo(
    () =>
      venues
        .map((v) => ({ v, d: distanceMeters(center, [v.lat, v.lng]) }))
        .sort((a, b) => a.d - b.d),
    [venues, center],
  );
  const liveList = withDistance.filter(({ v }) => v.offers.length > 0);
  const ping = liveList[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
          <Logo size={30} subtitle="Deals near you" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 py-12 md:py-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-success">
          Customer app
        </span>
        <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.02] md:text-5xl">
          Red pins for venues.
          <span className="text-success"> Pulsing green </span>
          when a deal is live.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          This map reads the same database as the partner portal — every approved venue appears,
          and any venue with an unexpired offer pulses green until the countdown hits zero.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Map */}
          <div className="glow relative h-[520px] overflow-hidden rounded-3xl border border-border bg-surface">
            <ClientOnly fallback={<MapSkeleton />}>
              <Suspense fallback={<MapSkeleton />}>
                <VenueMap
                  venues={venues as VenueWithOffers[]}
                  center={center}
                  selectedId={selected}
                  onSelect={setSelected}
                />
              </Suspense>
            </ClientOnly>

            {ping && (
              <div className="ping-in pointer-events-none absolute inset-x-4 top-4 z-[500] max-w-sm rounded-2xl border border-border/70 bg-surface-raised/95 p-3 backdrop-blur">
                <p className="text-[10px] uppercase tracking-[0.2em] text-success">
                  TAPDINE · push ping
                </p>
                <p className="mt-1 text-sm font-semibold leading-snug">
                  {ping.v.name} · {ping.v.offers[0]!.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistance(ping.d)} away · {timeLeft(ping.v.offers[0]!.expires_at, tick)}
                </p>
              </div>
            )}
          </div>

          {/* Nearby list */}
          <aside className="rounded-3xl border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {isLoading ? "Loading…" : `${liveList.length} live offers nearby`}
            </p>
            <ul className="mt-4 space-y-2">
              {liveList.map(({ v, d }) => {
                const offer = v.offers[0]!;
                return (
                  <li key={v.id}>
                    <button
                      onClick={() => setSelected(v.id)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-surface-raised px-3 py-3 text-left transition-colors hover:border-success/50"
                    >
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="pin-pulse absolute inset-0 rounded-full bg-success" />
                        <span className="relative h-2.5 w-2.5 rounded-full bg-success" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold">{v.name}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {offer.title}
                          {offer.price_text ? ` · ${offer.price_text}` : ""} · {formatDistance(d)}
                        </span>
                      </span>
                      <span className="shrink-0 text-[10px] font-semibold text-warning">
                        {timeLeft(offer.expires_at, tick)}
                      </span>
                    </button>
                  </li>
                );
              })}
              {!isLoading && liveList.length === 0 && (
                <li className="rounded-2xl border border-border/70 bg-surface-raised px-3 py-4 text-xs text-muted-foreground">
                  No live offers right now. Registered venues still show as red pins.
                </li>
              )}
            </ul>

            <h2 className="mt-8 text-sm font-semibold">All venues nearby</h2>
            <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              {withDistance.map(({ v, d }) => (
                <li key={v.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    <span
                      className={`mr-2 inline-block h-2 w-2 rounded-full ${
                        v.offers.length ? "bg-success" : "bg-brand"
                      }`}
                    />
                    {v.name}
                  </span>
                  <span className="shrink-0">{formatDistance(d)}</span>
                </li>
              ))}
            </ul>

          </aside>
        </div>
      </main>
      <footer className="border-t border-border/60 bg-surface/40">
        <div className="mx-auto w-full max-w-6xl px-5 py-10 text-sm text-muted-foreground">
          © {new Date().getFullYear()} TAPDINE
        </div>
      </footer>
    </div>
  );
}
