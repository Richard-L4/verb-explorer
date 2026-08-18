import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Lock } from "lucide-react";
import { useAccess } from "@/hooks/use-access";

const CONSENT =
  "I agree that access to the digital content begins immediately and acknowledge that I lose my 14-day right to cancel once access begins.";

export function Paywall({ title }: { title?: string }) {
  const { unlock, price, freeCardCount } = useAccess();
  const [agreed, setAgreed] = useState(false);
  const [paying, setPaying] = useState(false);

  function handlePay() {
    if (!agreed || paying) return;
    setPaying(true);
    // Payments are UI-only for now. A real provider call goes here; the unlock
    // is only recorded after a confirmed successful payment.
    unlock();
  }

  return (
    <section className="surface-card gradient-soft hairline-top relative overflow-hidden p-6 sm:p-9">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary/12 blur-3xl"
      />
      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
          <Lock className="size-3.5" aria-hidden="true" /> Locked
        </span>

        <h2 className="mt-5 text-balance font-display text-3xl font-bold leading-tight sm:text-4xl">
          Unlock Verb Wise — {price}
        </h2>
        <p className="mt-3 text-base text-foreground">One-off payment. Yours permanently. No subscription.</p>
        {title ? (
          <p className="mt-2 text-sm text-muted-foreground">
            “{title}” is part of the full deck. The first {freeCardCount} cards stay free forever.
          </p>
        ) : null}

        <label className="mt-7 flex max-w-2xl cursor-pointer items-start gap-3 rounded-xl border border-border/80 bg-background/30 p-4">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            required
            aria-required="true"
            className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary,currentColor)]"
          />
          <span className="text-sm leading-relaxed text-foreground">{CONSENT}</span>
        </label>

        <button
          type="button"
          onClick={handlePay}
          disabled={!agreed || paying}
          className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:hover:translate-y-0"
        >
          <Check className="size-4" aria-hidden="true" /> Pay {price} and Unlock
        </button>
        {!agreed ? (
          <p className="mt-2.5 text-xs text-muted-foreground">Tick the box above to continue.</p>
        ) : null}

        <p className="mt-6 text-sm text-muted-foreground">
          Read the{" "}
          <Link to="/refunds" className="font-semibold text-primary hover:underline">
            Refund Policy
          </Link>{" "}
          and{" "}
          <Link to="/terms" className="font-semibold text-primary hover:underline">
            Terms of Use
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
