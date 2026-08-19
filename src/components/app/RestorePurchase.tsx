import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RotateCcw } from "lucide-react";
import { restorePurchase } from "@/lib/checkout.functions";
import { useAccess } from "@/hooks/use-access";

/** Guest checkout: re-open access on another device using the checkout email. */
export function RestorePurchase() {
  const restore = useServerFn(restorePurchase);
  const { unlock } = useAccess();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRestore(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const { found } = await restore({ data: { email: email.trim().toLowerCase() } });
      if (found) {
        unlock();
        setMessage("Purchase found — everything is unlocked in this browser.");
      } else {
        setMessage("We couldn't find a purchase for that email address.");
      }
    } catch {
      setMessage("Something went wrong. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface-card mt-6 p-6">
      <h2 className="inline-flex items-center gap-2 text-lg font-bold">
        <RotateCcw className="size-4 text-primary" aria-hidden="true" /> Already bought Verb Wise?
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Enter the email you used at checkout to restore access on this device.
      </p>
      <form onSubmit={handleRestore} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Checkout email address"
          className="min-h-11 w-full max-w-sm rounded-full border border-border bg-background/40 px-4 text-sm text-foreground outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-5 text-sm font-bold text-primary transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null} Restore
        </button>
      </form>
      {message ? <p className="mt-3 text-sm font-semibold text-foreground">{message}</p> : null}
    </section>
  );
}
