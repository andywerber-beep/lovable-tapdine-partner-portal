import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { TapdineGate, gbp } from "@/components/partner/TapdineGate";
import { createPartnerOffer, getPartnerOffers, retireOffer } from "@/lib/passes.functions";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Offers — TapDine Partner Portal" },
      { name: "description", content: "Publish a time-limited food deal with a real photo and go live on the TapDine customer map." },
      { property: "og:title", content: "Your Offers — TapDine Partner Portal" },
      { property: "og:description", content: "Snap a photo, set a price and a time limit, and ping customers nearby." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: () => <TapdineGate title="Your offers">{({ token }) => <Offers token={token} />}</TapdineGate>,
});

/** Centre-crop to 4:3, resize to max 1600px wide, re-encode as JPEG — all in the browser. */
async function optimise(file: File): Promise<{ base64: string; preview: string; small: boolean }> {
  const bmp = await createImageBitmap(file);
  const ratio = 4 / 3;
  let sw = bmp.width, sh = bmp.height;
  if (sw / sh > ratio) sw = sh * ratio; else sh = sw / ratio;
  const sx = (bmp.width - sw) / 2, sy = (bmp.height - sh) / 2;
  const w = Math.min(1600, Math.round(sw));
  const h = Math.round(w / ratio);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
  const preview = c.toDataURL("image/jpeg", 0.82);
  return { base64: preview.split(",")[1], preview, small: w < 800 };
}

function Offers({ token }: { token: string }) {
  const qc = useQueryClient();
  const list = useServerFn(getPartnerOffers);
  const create = useServerFn(createPartnerOffer);
  const retire = useServerFn(retireOffer);
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [hours, setHours] = useState(2);
  const [photo, setPhoto] = useState<{ base64: string; preview: string; small: boolean } | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30_000); return () => clearInterval(t); }, []);

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["partner-offers"],
    queryFn: () => list({ data: { token } }),
    refetchInterval: 60_000,
  });
  const isLive = (o: (typeof offers)[number]) => o.is_active && o.expires_at && new Date(o.expires_at).getTime() > Date.now();
  const live = offers.filter(isLive);
  const past = offers.filter((o) => !isLive(o));

  async function pick(f: File | undefined) {
    if (!f) return;
    try { setPhoto(await optimise(f)); setMsg(null); } catch { setMsg("That photo couldn't be read — try a JPG or PNG."); }
  }

  async function publish() {
    if (!photo) return;
    setBusy(true); setMsg(null);
    try {
      await create({ data: { token, title, description: desc, price: Number(price), hours, imageBase64: photo.base64 } });
      setTitle(""); setDesc(""); setPrice(""); setPhoto(null);
      setMsg("You're live! Nearby customers are being pinged.");
      qc.invalidateQueries({ queryKey: ["partner-offers"] });
    } catch (e) { setMsg(e instanceof Error ? e.message : "Could not publish."); }
    setBusy(false);
  }

  async function end(id: number) {
    await retire({ data: { token, offerId: id } });
    qc.invalidateQueries({ queryKey: ["partner-offers"] });
  }

  const priceOk = Number(price) > 0;
  const ready = photo && title.trim().length >= 3 && desc.trim().length >= 3 && priceOk;
  const input = "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:border-brand focus:outline-none";

  return (
    <div className="space-y-8">
      {!isLoading && live.length === 0 && (
        <p className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm font-semibold">
          You're currently hidden from customers — publish an offer with a photo to go live on the map.
        </p>
      )}

      {live.map((o) => (
        <div key={o.id} className="flex items-center gap-4 rounded-2xl border border-success/40 bg-success/10 p-4">
          {o.image_url && <img src={o.image_url} alt={o.title} className="h-20 w-28 rounded-lg object-cover" />}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase text-success">Live on the map</p>
            <p className="truncate font-display text-lg font-extrabold">{o.title}</p>
            <p className="text-sm text-muted-foreground">
              {o.discount_price != null && gbp(Number(o.discount_price))} · {Math.max(0, Math.round((new Date(o.expires_at!).getTime() - Date.now()) / 60000))} min left
            </p>
          </div>
          <Button variant="outline" className="rounded-full" onClick={() => end(o.id)}>End now</Button>
        </div>
      ))}

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="font-display text-xl font-extrabold">{live.length ? "Replace with a new offer" : "Create an offer"}</h2>
        <div className="mt-5 grid gap-6 md:grid-cols-[1fr_1.2fr]">
          <div>
            <button
              type="button"
              onClick={() => { setShowTips(true); fileRef.current?.click(); }}
              className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-background text-sm font-semibold text-muted-foreground hover:border-brand"
            >
              {photo ? <img src={photo.preview} alt="Offer preview" className="h-full w-full object-cover" /> : "Take or choose a photo"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
            {photo?.small && <p className="mt-2 text-xs text-warning">This photo is quite small and may look blurry — try a closer, sharper shot.</p>}
            {showTips && (
              <div className="mt-3 rounded-xl bg-brand-soft p-4 text-xs leading-relaxed">
                <p className="font-bold">Tips for a photo that sells</p>
                <ul className="mt-1 list-disc pl-4">
                  <li>Photograph the real item customers will get — no stock images.</li>
                  <li>Use daylight near a window; avoid flash.</li>
                  <li>Fill the frame with the food, on a clean plate or surface.</li>
                  <li>Hold steady. We crop and resize it automatically.</li>
                </ul>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Headline, e.g. 20% off lobster rolls" maxLength={80} className={input} />
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What they get, e.g. Lobster roll in brioche with Marie Rose" maxLength={200} className={input} />
            <div className="grid grid-cols-2 gap-3">
              <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="Price £" inputMode="decimal" className={input} />
              <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className={input}>
                {[1, 2, 3, 4, 6, 8, 12, 24].map((h) => <option key={h} value={h}>Live for {h}h</option>)}
              </select>
            </div>
            <Button disabled={!ready || busy} onClick={publish} className="h-12 w-full rounded-full text-base font-extrabold">
              {busy ? "Publishing…" : photo ? "Publish offer" : "Add a photo to publish"}
            </Button>
            {msg && <p className="text-sm font-semibold">{msg}</p>}
          </div>
        </div>
      </section>

      {past.length > 0 && (
        <section>
          <h3 className="text-sm font-bold uppercase text-muted-foreground">Past offers</h3>
          <div className="mt-3 space-y-2">
            {past.slice(0, 8).map((o) => (
              <div key={o.id} className="flex items-center gap-3 rounded-xl border border-border/60 px-4 py-2.5 text-sm text-muted-foreground">
                <span className="flex-1 truncate">{o.title}</span>
                <span>ended</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
