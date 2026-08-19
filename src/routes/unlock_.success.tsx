import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2 } from "lucide-react";
import { PageTransition } from "@/components/app/PageTransition";
import { PageHeader } from "@/components/app/PageHeader";
import { confirmCheckout } from "@/lib/checkout.functions";
import { useAccess } from "@/hooks/use-access";

export const Route = createFileRoute("/unlock_/success")({
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: typeof search["session_id"] === "string" ? search["session_id"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Payment confirmed — Verb Wise" },
      { name: "description", content: "Confirming your Verb Wise unlock and opening every card." },
      { property: "og:title", content: "Payment confirmed — Verb Wise" },
      { property: "og:description", content: "Your one-off Verb Wise unlock is being confirmed." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SuccessRoute,
});

type Status = "checking" | "done" | "pending" | "error";

function SuccessRoute() {
  const { session_id: sessionId } = Route.useSearch();
  const confirm = useServerFn(confirmCheckout);
  const { unlock } = useAccess();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!sessionId) {
      setStatus("error");
      return;
    }

    let cancelled = false;
    // The webhook usually lands first; retry briefly, then fall back to Stripe.
    const delays = [0, 1500, 3000, 5000];

    (async () => {
      for (const delay of delays) {
        if (cancelled) return;
        if (delay) await new Promise((r) => setTimeout(r, delay));
        try {
          const result = await confirm({ data: { sessionId } });
          if (cancelled) return;
          if (result.paid) {
            unlock();
            setStatus("done");
            return;
          }
        } catch {
          /* keep retrying */
        }
      }
      if (!cancelled) setStatus("pending");
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, confirm, unlock]);

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Checkout"
        title={status === "done" ? "You're unlocked" : "Confirming your payment"}
        description={
          status === "done"
            ? "Thank you. Every Verb Wise card is now open in this browser."
            : "This only takes a moment."
        }
      />

      <section className="surface-card gradient-soft relative overflow-hidden p-6 sm:p-9">
        <div className="relative flex flex-col items-start gap-4">
          {status === "checking" ? (
            <p className="inline-flex items-center gap-2 text-base text-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Checking with Stripe…
            </p>
          ) : null}

          {status === "done" ? (
            <>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                <Check className="size-3.5" aria-hidden="true" /> Unlocked
              </span>
              <p className="max-w-2xl text-base text-foreground">
                Your one-off payment is complete and recorded. There is nothing to renew.
              </p>
              <button
                type="button"
                onClick={() => navigate({ to: "/browse" })}
                className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
              >
                Browse all cards
              </button>
            </>
          ) : null}

          {status === "pending" ? (
            <p className="max-w-2xl text-base text-foreground">
              Stripe hasn't confirmed this payment yet. If money left your account, reload this page
              in a minute — or use the restore box on the{" "}
              <Link to="/unlock" className="font-semibold text-primary hover:underline">
                unlock page
              </Link>
              .
            </p>
          ) : null}

          {status === "error" ? (
            <p className="max-w-2xl text-base text-foreground">
              We couldn't find a checkout session in this link. Please start again from the{" "}
              <Link to="/unlock" className="font-semibold text-primary hover:underline">
                unlock page
              </Link>
              .
            </p>
          ) : null}
        </div>
      </section>
    </PageTransition>
  );
}
