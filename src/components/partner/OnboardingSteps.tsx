import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveVenueDetails, acceptAgreement, enterPortal } from "@/lib/passes.functions";

export type OnboardingVenue = {
  name: string | null;
  status: string | null;
  owner_name: string | null;
  cuisine_type: string | null;
  tel_number: string | null;
  address1: string | null;
  address2: string | null;
  town: string | null;
  postcode: string | null;
  website_url: string | null;
};

const STEPS = ["Venue details", "Agreement", "Documents", "Approval"];

export function StepProgress({ current }: { current: number }) {
  return (
    <ol className="mx-auto mb-8 flex max-w-xl items-center gap-2">
      {STEPS.map((s, i) => (
        <li key={s} className="flex flex-1 flex-col items-center gap-1.5 text-center">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
              i < current ? "bg-success text-success-foreground" : i === current ? "bg-brand text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {i < current ? <Check className="h-4 w-4" /> : i + 1}
          </span>
          <span className={`text-[11px] font-semibold ${i === current ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
        </li>
      ))}
    </ol>
  );
}

const inputCls =
  "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:border-brand focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}

function Header({ badge, title, sub }: { badge: string; title: string; sub: string }) {
  return (
    <div className="text-center">
      <p className="inline-block rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand">{badge}</p>
      <h2 className="mt-3 font-display text-2xl font-extrabold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

function errMsg(e: unknown) {
  if (e instanceof Error) {
    try {
      const parsed = JSON.parse(e.message) as Array<{ message?: string }>;
      if (Array.isArray(parsed) && parsed[0]?.message) return parsed[0].message;
    } catch {
      /* plain message */
    }
    return e.message;
  }
  return "Something went wrong.";
}

export function VenueDetailsStep({ venue, token, onDone, onSignOut }: { venue: OnboardingVenue; token: string; onDone: () => void; onSignOut: () => void }) {
  const save = useServerFn(saveVenueDetails);
  const [f, setF] = useState({
    name: venue.name ?? "",
    ownerName: venue.owner_name ?? "",
    cuisineType: venue.cuisine_type ?? "",
    telNumber: venue.tel_number ?? "",
    address1: venue.address1 ?? "",
    address2: venue.address2 ?? "",
    town: venue.town ?? "",
    postcode: venue.postcode ?? "",
    websiteUrl: venue.website_url ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await save({ data: { token, ...f } });
      onDone();
    } catch (e2) {
      setErr(errMsg(e2));
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <StepProgress current={0} />
      <Header badge="Step 1 of 4" title="Tell us about your venue" sub="These details put you on the map for nearby customers and help us verify you." />
      <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-border bg-surface p-6">
        <Field label="Venue name"><input required value={f.name} onChange={set("name")} placeholder="e.g. Malt Café" className={inputCls} /></Field>
        <Field label="Owner's full name (must match your ID)"><input required value={f.ownerName} onChange={set("ownerName")} placeholder="e.g. Jane Smith" className={inputCls} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cuisine type"><input required value={f.cuisineType} onChange={set("cuisineType")} placeholder="e.g. Café, Pizza" className={inputCls} /></Field>
          <Field label="Phone number"><input required type="tel" value={f.telNumber} onChange={set("telNumber")} placeholder="e.g. 01273 123456" className={inputCls} /></Field>
        </div>
        <Field label="Address line 1"><input required value={f.address1} onChange={set("address1")} placeholder="e.g. 12 Gardner Street" className={inputCls} /></Field>
        <Field label="Address line 2 (optional)"><input value={f.address2} onChange={set("address2")} placeholder="Unit, floor, etc." className={inputCls} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Town / city"><input required value={f.town} onChange={set("town")} placeholder="e.g. Brighton" className={inputCls} /></Field>
          <Field label="Postcode"><input required value={f.postcode} onChange={set("postcode")} placeholder="e.g. BN1 1UP" className={inputCls} /></Field>
        </div>
        <Field label="Website or menu link (optional)"><input value={f.websiteUrl} onChange={set("websiteUrl")} placeholder="https://" className={inputCls} /></Field>
        {err && <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">{err}</p>}
        <Button type="submit" disabled={busy} className="h-12 w-full rounded-full text-base font-bold">
          {busy ? "Checking your address…" : "Save & continue"}
        </Button>
      </form>
      <div className="flex justify-center"><Button variant="ghost" className="rounded-full" onClick={onSignOut}>Sign out</Button></div>
    </div>
  );
}

export function AgreementStep({ token, onDone, onSignOut }: { token: string; onDone: () => void; onSignOut: () => void }) {
  const accept = useServerFn(acceptAgreement);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onAccept() {
    if (!agreed) return setErr("Please tick the box to accept the agreement.");
    setBusy(true);
    setErr(null);
    try {
      await accept({ data: { token, accepted: true } });
      onDone();
    } catch (e) {
      setErr(errMsg(e));
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <StepProgress current={1} />
      <Header badge="Step 2 of 4" title="Your partner agreement" sub="Simple, fair terms. No monthly fees, no hidden costs." />
      <div className="space-y-5 rounded-3xl border border-border bg-surface p-6">
        <div className="rounded-2xl border border-brand/25 bg-brand-soft p-5">
          <p className="font-display text-lg font-extrabold">0% commission for your first 3 months</p>
          <p className="mt-1 text-sm text-muted-foreground">As a founding partner. After that, a flat 10% commission on sales through TapDine.</p>
        </div>
        <div className="max-h-56 space-y-3 overflow-y-auto rounded-2xl border border-border bg-background p-4 text-sm leading-relaxed text-muted-foreground">
          <p><strong className="text-foreground">1. What TapDine does.</strong> The portal lets your venue publish offers, add photos and menu links, redeem customer passes and track your earnings.</p>
          <p><strong className="text-foreground">2. Commission.</strong> Founding partners pay 0% commission for their first 3 months. After that, a flat 10% commission applies to purchases made through TapDine. It is taken automatically at the time of purchase; you receive the remaining 90%.</p>
          <p><strong className="text-foreground">3. No fees.</strong> There are no set-up fees, monthly fees or lock-in periods. You can pause or remove offers at any time.</p>
          <p><strong className="text-foreground">4. Passes.</strong> Customers have 30 minutes from payment to redeem a pass at your venue. Staff should decline passes that have expired or belong to another venue.</p>
          <p><strong className="text-foreground">5. Verification.</strong> You must hold valid public liability insurance and a food hygiene rating of 3 or above, and keep your details up to date.</p>
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[var(--brand)]" />
          <span>I accept the TapDine partner agreement, including 0% commission for 3 months and a flat 10% commission thereafter.</span>
        </label>
        {err && <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">{err}</p>}
        <Button onClick={onAccept} disabled={busy} className="h-12 w-full rounded-full text-base font-bold">
          {busy ? "Saving…" : "Accept & continue"}
        </Button>
      </div>
      <div className="flex justify-center"><Button variant="ghost" className="rounded-full" onClick={onSignOut}>Sign out</Button></div>
    </div>
  );
}

export function WelcomeStep({ name, token, onDone }: { name: string | null; token: string; onDone: () => void }) {
  const enter = useServerFn(enterPortal);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="mx-auto max-w-xl space-y-6 text-center">
      <div className="rounded-3xl border border-border bg-surface p-8">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success text-success-foreground">
          <PartyPopper className="h-8 w-8" />
        </span>
        <h2 className="mt-5 font-display text-3xl font-extrabold">You're approved!</h2>
        {name && <p className="mt-1 text-lg font-semibold text-brand">{name}</p>}
        <p className="mt-4 text-sm text-muted-foreground">
          Your documents have been verified and your venue is ready to go live on the map. You can now publish deals, redeem passes and track your earnings.
        </p>
        {err && <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">{err}</p>}
        <Button
          disabled={busy}
          className="mt-6 h-12 w-full rounded-full text-base font-bold"
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              await enter({ data: { token } });
              onDone();
            } catch (e) {
              setErr(errMsg(e));
            }
            setBusy(false);
          }}
        >
          {busy ? "Opening…" : "Enter your portal"}
        </Button>
      </div>
    </div>
  );
}
