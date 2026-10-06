import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { TapdineGate, gbp } from "@/components/partner/TapdineGate";
import { createPartnerOffer, getPartnerOffers, retireOffer, updateOfferImage } from "@/lib/passes.functions";
import { PayoutsCard } from "@/components/partner/PayoutsCard";

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
async function optimise(file: File): Promise<Photo> {
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
  return { base64: preview.split(",")[1] ?? "", preview, small: w < 800, name: file.name };
}
type Photo = { base64: string; preview: string; small: boolean; name: string; reuseId?: number };

function Offers({ token }: { token: string }) {
  const qc = useQueryClient();
  const list = useServerFn(getPartnerOffers);
  const create = useServerFn(createPartnerOffer);
  const retire = useServerFn(retireOffer);
  const updateImage = useServerFn(updateOfferImage);
  const fileRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLElement>(null);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [hours, setHours] = useState(2);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [drag, setDrag] = useState(false);
  const [editTarget, setEditTarget] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
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
    if (!f.type.startsWith("image/")) { setMsg("Please choose an image file."); return; }
    try { setPhoto(await optimise(f)); setMsg(null); } catch { setMsg("That photo couldn't be read — try a JPG or PNG."); }
  }

  async function changePhoto(f: File | undefined) {
    if (!f || editTarget == null) return;
    setEditing(editTarget); setMsg(null);
    try {
      const p = await optimise(f);
      await updateImage({ data: { token, offerId: editTarget, imageBase64: p.base64, fileName: p.name } });
      qc.invalidateQueries({ queryKey: ["partner-offers"] });
    } catch (e) { setMsg(e instanceof Error ? e.message : "Could not update the photo."); }
    setEditing(null); setEditTarget(null);
  }

  function reuse(o: (typeof offers)[number]) {
    setTitle(o.title ?? ""); setDesc(o.description ?? "");
    setPrice(o.discount_price != null ? String(o.discount_price) : "");
    setPhoto(o.image_url ? { base64: "", preview: o.image_url, small: false, name: "", reuseId: o.id } : null);
    setMsg(o.image_url ? "Past offer loaded — check the details and publish." : "Past offer loaded — add a photo to publish.");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function publish() {
    if (!photo) return;
    setBusy(true); setMsg(null);
    try {
      const img = photo.reuseId ? { reuseOfferId: photo.reuseId } : { imageBase64: photo.base64, fileName: photo.name };
      await create({ data: { token, title, description: desc, price: Number(price), hours, ...img } });
      setTitle(""); setDesc(""); setPrice(""); setPhoto(null);
      setMsg("You're live on the map! Diners exploring nearby with TapDine open can see your live deals.");
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
      <PayoutsCard token={token} />
      {!isLoading && live.length === 0 && (
        <p className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm font-semibold">
          You're currently hidden from customers — publish an offer with a photo to go live on the map.
        </p>
      )}
      {live.length > 0 && (
        <div className="rounded-xl border border-success/40 bg-success/10 p-4 text-sm">
          <p className="font-semibold">You're live on the map! Diners exploring nearby with TapDine open can see your live deals.</p>
          <p className="mt-1 text-muted-foreground">(Full background pocket alerts launch with our native app store release.)</p>
        </div>
      )}

      {live.map((o) => (
        <div key={o.id} className="flex items-center gap-4 rounded-2xl border border-success/40 bg-success/10 p-4">
          {o.image_url ? <img src={o.image_url} alt={o.title} className="h-20 w-28 rounded-lg object-cover" /> : <div className="h-20 w-28 rounded-lg bg-muted" />}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase text-success">Live on the map</p>
            <p className="truncate font-display text-lg font-extrabold">{o.title}</p>
            <p className="text-sm text-muted-foreground">
              {o.discount_price != null && gbp(Number(o.discount_price))} · {Math.max(0, Math.round((new Date(o.expires_at!).getTime() - Date.now()) / 60000))} min left
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" className="rounded-full" disabled={editing === o.id} onClick={() => { setEditTarget(o.id); editRef.current?.click(); }}>
              {editing === o.id ? "Uploading…" : "Change photo"}
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => end(o.id)}>End now</Button>
          </div>
        </div>
      ))}
      <input ref={editRef} type="file" accept="image/*" className="hidden" onChange={(e) => { changePhoto(e.target.files?.[0]); e.target.value = ""; }} />

      <section ref={formRef} className="scroll-mt-24 rounded-2xl border border-border bg-surface p-6">
        <h2 className="font-display text-xl font-extrabold">{live.length ? "Add another offer" : "Create an offer"}</h2>
        <div className="mt-5 grid gap-6 md:grid-cols-[1fr_1.2fr]">
          <div>
            {photo ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border">
                <img src={photo.preview} alt="Offer preview" className="h-full w-full object-cover" />
                <div className="absolute bottom-2 right-2 flex gap-2">
                  <Button type="button" size="sm" variant="secondary" className="rounded-full" onClick={() => fileRef.current?.click()}>Replace</Button>
                  <Button type="button" size="sm" variant="destructive" className="rounded-full" onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = ""; }}>Remove</Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setShowTips(true); fileRef.current?.click(); }}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); setShowTips(true); pick(e.dataTransfer.files?.[0]); }}
                className={`flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed bg-background text-sm font-semibold text-muted-foreground hover:border-brand ${drag ? "border-brand bg-brand-soft" : "border-border"}`}
              >
                <span>Take or choose a dish photo</span>
                <span className="text-xs font-normal">or drag & drop it here</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
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
              <div key={o.id} className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2 text-sm text-muted-foreground">
                {o.image_url ? <img src={o.image_url} alt={o.title} className="h-10 w-14 rounded-md object-cover" /> : <div className="h-10 w-14 rounded-md bg-muted" />}
                <span className="flex-1 truncate">{o.title}</span>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => reuse(o)}>Reuse offer</Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
