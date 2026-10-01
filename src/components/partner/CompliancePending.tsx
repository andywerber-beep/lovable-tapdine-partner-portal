import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitCompliance } from "@/lib/passes.functions";
import { StepProgress } from "@/components/partner/OnboardingSteps";

export type ComplianceVenue = {
  name: string | null;
  status: string | null;
  id_provided: boolean | null;
  insurance_provided: boolean | null;
  hygiene_provided: boolean | null;
};

type Doc = { name: string; type: "application/pdf" | "image/png" | "image/jpeg"; base64: string };

async function toDoc(f: File): Promise<Doc> {
  const buf = new Uint8Array(await f.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  const type = f.type === "image/png" ? "image/png" : f.type === "application/pdf" ? "application/pdf" : "image/jpeg";
  return { name: f.name, type, base64: btoa(bin) };
}

function Row({ ok, pending, title, sub }: { ok: boolean; pending?: boolean; title: string; sub: string }) {
  const Icon = ok ? Check : pending ? Clock : AlertCircle;
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-4 ${ok ? "border-success/40 bg-success/10" : "border-warning/40 bg-warning/10"}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ok ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

export function CompliancePending({ venue, token, onDone, onSignOut }: { venue: ComplianceVenue; token: string; onDone: () => void; onSignOut: () => void }) {
  const submit = useServerFn(submitCompliance);
  const [insFile, setInsFile] = useState<File | null>(null);
  const [expiry, setExpiry] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const needsUploads = !venue.insurance_provided;
  const underReview = venue.status === "under_review";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!venue.insurance_provided && (!insFile || !expiry)) return setErr("Please upload your insurance certificate and add its expiry date.");
    for (const f of [insFile]) if (f && f.size > 8 * 1024 * 1024) return setErr("Each file must be under 8MB.");
    setBusy(true);
    try {
      await submit({
        data: {
          token,
          insuranceDoc: !venue.insurance_provided && insFile ? await toDoc(insFile) : undefined,
          insuranceExpiry: !venue.insurance_provided ? expiry : undefined,
        },
      });
      onDone();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong.");
    }
    setBusy(false);
  }

  const fileCls = "w-full rounded-2xl border-2 border-dashed border-border bg-background p-4 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:font-semibold file:text-brand";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <StepProgress current={underReview ? 3 : 2} />
      <div className="text-center">
        <p className="inline-block rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand">
          {underReview ? "Verifying" : "One last step"}
        </p>
        <h2 className="mt-3 font-display text-2xl font-extrabold">
          {underReview ? "We're verifying your venue" : "Let's get you verified"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {underReview
            ? "Thanks! Our team is checking your documents. You'll be able to publish deals and redeem passes as soon as you're approved."
            : "Upload your insurance certificate so we can approve your venue. As a founding partner you'll pay 0% commission for your first 3 months."}
        </p>
      </div>

      <div className="space-y-3 rounded-3xl border border-border bg-surface p-5">
        <Row ok={!!venue.hygiene_provided} title="Food hygiene rating" sub="Verified on the Food Standards Agency register" />
        <Row ok={!!venue.insurance_provided} pending={underReview} title="Public liability insurance" sub={venue.insurance_provided ? "Received — under review by our team" : "Upload your certificate below"} />

        {needsUploads ? (
          <form onSubmit={onSubmit} className="space-y-4 border-t border-border pt-5">
            {!venue.insurance_provided && (
              <>
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold">Insurance certificate (PDF, PNG or JPG)</span>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setInsFile(e.target.files?.[0] ?? null)} className={fileCls} />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold">Policy expiry date</span>
                  <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:border-brand focus:outline-none" />
                </label>
              </>
            )}
            {err && <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">{err}</p>}
            <Button type="submit" disabled={busy} className="h-12 w-full rounded-full text-base font-bold">
              {busy ? "Uploading…" : "Send for verification"}
            </Button>
          </form>
        ) : (
          <p className="border-t border-border pt-4 text-center text-sm text-muted-foreground">All documents received. We'll let you know once you're approved.</p>
        )}
      </div>

      <div className="flex justify-center gap-3">
        <Button variant="outline" className="rounded-full" onClick={onDone}>Check again</Button>
        <Button variant="ghost" className="rounded-full" onClick={onSignOut}>Sign out</Button>
      </div>
    </div>
  );
}
