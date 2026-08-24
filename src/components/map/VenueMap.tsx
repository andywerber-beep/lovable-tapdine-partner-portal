import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMapsKey } from "@/lib/maps.functions";
import type { VenueWithOffers } from "@/lib/tapdine";
import { timeLeft } from "@/lib/tapdine";

type Props = {
  venues: VenueWithOffers[];
  center: [number, number];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

declare global {
  interface Window {
    google?: any;
    __tapdineMapsPromise?: Promise<void>;
  }
}

function loadGoogleMaps(key: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (window.__tapdineMapsPromise) return window.__tapdineMapsPromise;
  window.__tapdineMapsPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=marker&v=weekly`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return window.__tapdineMapsPromise;
}

function pinElement(live: boolean) {
  const el = document.createElement("span");
  el.className = `tapdine-pin-dot${live ? " is-live" : ""}`;
  return el;
}

export default function VenueMap({ venues, center, selectedId, onSelect }: Props) {
  const holder = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const infoRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchKey = useServerFn(getMapsKey);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { key } = await fetchKey();
        if (!key) throw new Error("Google Maps key not configured");
        await loadGoogleMaps(key);
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Map failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  useEffect(() => {
    if (!ready || !holder.current || mapRef.current) return;
    const g = window.google;
    const map = new g.maps.Map(holder.current, {
      center: { lat: center[0], lng: center[1] },
      zoom: 15,
      mapId: "DEMO_MAP_ID",
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
    });
    new g.maps.Circle({
      map,
      center: { lat: center[0], lng: center[1] },
      radius: 900,
      strokeColor: "#f2765f",
      strokeWeight: 1,
      fillColor: "#f2765f",
      fillOpacity: 0.08,
    });
    const me = document.createElement("span");
    me.className = "tapdine-pin-me";
    new g.maps.marker.AdvancedMarkerElement({
      map,
      position: { lat: center[0], lng: center[1] },
      content: me,
    });
    infoRef.current = new g.maps.InfoWindow();
    mapRef.current = map;
  }, [ready, center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const g = window.google;
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    venues.forEach((v) => {
      const live = v.offers.length > 0;
      const offer = v.offers[0];
      const marker = new g.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: v.lat, lng: v.lng },
        content: pinElement(live),
        title: v.name,
      });
      const html = `<div class="tapdine-popup"><strong>${v.name}</strong><br/><span>${v.category}</span>${
        offer
          ? `<br/><span class="live">${offer.title}${
              offer.price_text ? ` · ${offer.price_text}` : ""
            }</span><br/><span class="until">${timeLeft(offer.expires_at)}</span>`
          : ""
      }${
        v.menu_url || v.website_url
          ? `<br/><a href="${v.menu_url ?? v.website_url}" target="_blank" rel="noreferrer">View menu</a>`
          : ""
      }</div>`;
      marker.addListener("click", () => {
        infoRef.current?.setContent(html);
        infoRef.current?.open({ map, anchor: marker });
        onSelect?.(v.id);
      });
      if (selectedId === v.id) {
        infoRef.current?.setContent(html);
        infoRef.current?.open({ map, anchor: marker });
      }
      markersRef.current.push(marker);
    });
  }, [venues, selectedId, onSelect, ready]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted p-6 text-center text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  return <div ref={holder} className="h-full w-full" />;
}
