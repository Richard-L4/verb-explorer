import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RotateCcw } from "lucide-react";
import { requestRestoreCode, verifyRestoreCode } from "@/lib/restore.functions";
import { useAccess } from "@/hooks/use-access";
import { saveContentPass } from "@/hooks/use-subjunctive";

const inputCls =
  "min-h-11 w-full max-w-sm rounded-full border border-border bg-background/40 px-4 text-sm text-foreground outline-none focus:border-primary";
const buttonCls =
  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-5 text-sm font-bold text-primary transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50";

/**
 * Restore on another device: email → one-time code → server-issued pass.
 * The server alone decides success; the reply never reveals purchase status.
 */
export function RestorePurchase() {
  const sendCode = useServerFn(requestRestoreCode);
  const verify = useServerFn(verifyRestoreCode);
  const { unlock } = useAccess();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await sendCode({ data: { email: email.trim().toLowerCase() } });
      if (res.ok) {
        setStep("code");
        setMessage("If that email has a Verb Wise purchase, we've sent a 6-digit code. It expires in 10 minutes.");
      } else {
        setMessage("Something went wrong. Please try again in a moment.");
      }
    } catch {
      setMessage("Something went wrong. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCode(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !code.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await verify({ data: { email: email.trim().toLowerCase(), code: code.trim() } });
      if (res.ok && res.pass) {
        unlock();
        await saveContentPass(res.pass);
        setMessage("Purchase confirmed — everything is unlocked in this browser.");
      } else {
        setMessage("That code isn't valid or has expired. Check it, or request a new one.");
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
        Enter the email you used at checkout. We'll email you a one-time code to restore access on this device.
      </p>
      {step === "email" ? (
        <form onSubmit={handleEmail} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Checkout email address"
            className={inputCls}
          />
          <button type="submit" disabled={busy} className={buttonCls}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null} Send code
          </button>
        </form>
      ) : (
        <form onSubmit={handleCode} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="6-digit code"
            aria-label="Restore code"
            className={inputCls}
          />
          <button type="submit" disabled={busy} className={buttonCls}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null} Restore
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setMessage(null);
            }}
            className="min-h-11 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Use a different email
          </button>
        </form>
      )}
      {message ? (
        <p className="mt-3 text-sm font-semibold text-foreground" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
