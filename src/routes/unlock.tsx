import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Paywall } from "@/components/app/Paywall";
import { PageTransition } from "@/components/app/PageTransition";
import { PageHeader } from "@/components/app/PageHeader";
import { useAccess } from "@/hooks/use-access";

export const Route = createFileRoute("/unlock")({
  head: () => ({
    meta: [
      { title: "Unlock Verb Wise — £4.99" },
      {
        name: "description",
        content:
          "Unlock every Verb Wise card with a one-off £4.99 payment. Permanent access, no subscription.",
      },
      { property: "og:title", content: "Unlock Verb Wise — £4.99" },
      {
        property: "og:description",
        content: "One-off £4.99 payment for permanent access to every card.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UnlockRoute,
});

function UnlockRoute() {
  const { unlocked, creator, fullAccess, price } = useAccess();

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Unlock"
        title="Unlock Verb Wise"
        description="One-off payment. Yours permanently. No subscription."
      />

      {unlocked || creator || fullAccess ? (
        <section className="surface-card gradient-soft relative overflow-hidden p-6 sm:p-9">
          <div className="relative flex flex-col items-start gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              <Check className="size-3.5" aria-hidden="true" /> Unlocked
            </span>
            <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
              You have full access
            </h2>
            <p className="max-w-2xl text-base text-foreground">
              Every card is open in this browser. Enjoy the full deck.
            </p>
            <Link
              to="/browse"
              className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              Browse all cards
            </Link>
          </div>
        </section>
      ) : (
        <Paywall />
      )}
    </PageTransition>
  );
}
