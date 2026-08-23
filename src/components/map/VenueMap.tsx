import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { VenueWithOffers } from "@/lib/tapdine";
import { timeLeft } from "@/lib/tapdine";

type Props = {
  venues: VenueWithOffers[];
  center: [number, number];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

function pinIcon(live: boolean) {
  return L.divIcon({
    className: "tapdine-pin",
    html: `<span class="tapdine-pin-dot ${live ? "is-live" : ""}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export default function VenueMap({ venues, center, selectedId, onSelect }: Props) {
  const holder = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!holder.current || mapRef.current) return;
    const map = L.map(holder.current, {
      center,
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      maxZoom: 19,
    }).addTo(map);
    L.circle(center, {
      radius: 900,
      color: "#f2765f",
      weight: 1,
      fillColor: "#f2765f",
      fillOpacity: 0.08,
    }).addTo(map);
    L.marker(center, {
      icon: L.divIcon({
        className: "tapdine-pin",
        html: '<span class="tapdine-pin-me"></span>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    venues.forEach((v) => {
      const live = v.offers.length > 0;
      const offer = v.offers[0];
      const marker = L.marker([v.lat, v.lng], { icon: pinIcon(live) }).addTo(layer);
      marker.bindPopup(
        `<div class="tapdine-popup"><strong>${v.name}</strong><br/><span>${v.category}</span>${
          offer
            ? `<br/><span class="live">${offer.title}${
                offer.price_text ? ` · ${offer.price_text}` : ""
              }</span><br/><span class="until">${timeLeft(offer.expires_at)}</span>`
            : ""
        }${
          v.menu_url || v.website_url
            ? `<br/><a href="${v.menu_url ?? v.website_url}" target="_blank" rel="noreferrer">View menu</a>`
            : ""
        }</div>`,
      );
      marker.on("click", () => onSelect?.(v.id));
      if (selectedId === v.id) marker.openPopup();
    });
  }, [venues, selectedId, onSelect]);

  return <div ref={holder} className="h-full w-full" />;
}
