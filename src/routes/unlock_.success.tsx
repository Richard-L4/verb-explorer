/*
 * Stripe return page at /unlock/success: the trailing underscore in unlock_
 * keeps this route outside the /unlock parent layout while preserving its URL.
 * Browser UI calls confirmCheckout on the server, which verifies the Stripe session
 * and claims the database purchase before returning a signed content pass.
 * Checkout-marker binding prevents a copied success link from unlocking other devices.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2 } from "lucide-react";
import { PageTransition } from "@/components/app/PageTransition";
import { PageHeader } from "@/components/app/PageHeader";
import { confirmCheckout } from "@/lib/checkout.functions";
import { useAccess } from "@/hooks/use-access";
import { saveContentPass } from "@/hooks/use-subjunctive";

// createFileRoute connects this filename to its URL in the generated route tree.
export const Route = createFileRoute("/unlock_/success")({
  // Query strings are untrusted input; keep only recognised values before the UI uses them.
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: typeof search["session_id"] === "string" ? search["session_id"] : "",
  }),
  // head supplies document titles and metadata, not visible page content.
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

type Status = "checking" | "done" | "pending" | "error" | "restore";

const PENDING_KEY = "vw_pending_checkout";

/**
 * Takes the payment reference out of the address bar immediately and keeps it
 * only for this tab (sessionStorage) so a reload can retry within the window.
 */
function takeSessionId(fromUrl: string): string {
  if (typeof window === "undefined") return fromUrl;
  try {
    if (fromUrl) window.sessionStorage.setItem(PENDING_KEY, fromUrl);
    if (window.location.search) window.history.replaceState(window.history.state, "", window.location.pathname);
    return fromUrl || window.sessionStorage.getItem(PENDING_KEY) || "";
  } catch {
    return fromUrl;
  }
}

function forgetSessionId() {
  try {
    window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

function SuccessRoute() {
  const { session_id: urlSessionId } = Route.useSearch();
  // useServerFn creates a browser-callable wrapper; payment secrets and checks stay server-side.
  const confirm = useServerFn(confirmCheckout);
  const { unlock } = useAccess();
  const navigate = useNavigate();
  // State controls the visible message; a ref remembers a value without triggering a render.
  const [status, setStatus] = useState<Status>("checking");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const sessionId = takeSessionId(urlSessionId);

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
            // Update the local display only after server confirmation; protected requests use the pass.
            unlock();
            void saveContentPass(result.pass);
            forgetSessionId();
            setStatus("done");
            return;
          }
          if (result.status === "restore") {
            forgetSessionId();
            setStatus("restore");
            return;
          }
        } catch {
          /* keep retrying */
        }
      }
      if (!cancelled) setStatus("pending");
    })();

    // Cleanup prevents an in-flight response updating a page the user has left.
    return () => {
      cancelled = true;
    };
  }, [urlSessionId, confirm, unlock]);

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

          {status === "restore" ? (
            <p className="max-w-2xl text-base text-foreground">
              This payment link has already been used. To open Verb Wise on this device, use{" "}
              <span className="font-semibold">Restore by email</span> on the{" "}
              <Link to="/unlock" className="font-semibold text-primary hover:underline">
                unlock page
              </Link>{" "}
              with the email address you paid with.
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
