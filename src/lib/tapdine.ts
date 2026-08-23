import { supabase } from "@/integrations/supabase/client";

export type VenueStatus = "pending" | "approved" | "rejected";

export type Venue = {
  id: string;
  owner_id: string | null;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  website_url: string | null;
  menu_url: string | null;
  phone: string | null;
  status: VenueStatus;
  hygiene_rating: number | null;
  insurance_doc_path: string | null;
  insurance_expiry: string | null;
  insurance_verified_at: string | null;
  insurance_verified_by: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
};

export type Offer = {
  id: string;
  venue_id: string;
  title: string;
  description: string | null;
  price_text: string | null;
  image_url: string | null;
  starts_at: string;
  expires_at: string;
  created_at: string;
};

export type VenueWithOffers = Venue & { offers: Offer[] };

const VENUE_COLUMNS =
  "id, owner_id, name, category, address, lat, lng, website_url, menu_url, phone, status, hygiene_rating, insurance_doc_path, insurance_expiry, insurance_verified_at, insurance_verified_by, review_note, created_at, updated_at";

/** Approved venues + their currently-live offers (readable by anyone). */
export async function fetchPublicVenues(): Promise<VenueWithOffers[]> {
  const [venuesRes, offersRes] = await Promise.all([
    supabase.from("venues").select(VENUE_COLUMNS).eq("status", "approved").order("name"),
    supabase.from("offers").select("*").gt("expires_at", new Date().toISOString()),
  ]);
  if (venuesRes.error) throw venuesRes.error;
  if (offersRes.error) throw offersRes.error;

  const offers = (offersRes.data ?? []) as Offer[];
  return ((venuesRes.data ?? []) as Venue[]).map((v) => ({
    ...v,
    offers: offers.filter((o) => o.venue_id === v.id),
  }));
}

/** Every venue in the system — only returns rows for an admin. */
export async function fetchAllVenues(): Promise<Venue[]> {
  const { data, error } = await supabase
    .from("venues")
    .select(VENUE_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Venue[];
}

export async function fetchMyVenue(userId: string): Promise<Venue | null> {
  const { data, error } = await supabase
    .from("venues")
    .select(VENUE_COLUMNS)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Venue | null) ?? null;
}

export async function fetchVenueOffers(venueId: string): Promise<Offer[]> {
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("venue_id", venueId)
    .order("expires_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Offer[];
}

export function isLive(offer: Offer, now = Date.now()) {
  return new Date(offer.expires_at).getTime() > now;
}

export function timeLeft(expiresAt: string, now = Date.now()) {
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return "expired";
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m left` : `${m}m left`;
}

export function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

/** Metres between two coordinates (haversine). */
export function distanceMeters(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function formatDistance(m: number) {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}
