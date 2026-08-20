import { createFileRoute, Link } from "@tanstack/react-router";
import { PageTransition } from "@/components/app/PageTransition";
import { PageHeader } from "@/components/app/PageHeader";
import { LegalSection } from "@/components/app/LegalSection";

export const Route = createFileRoute("/terms")({
  component: Terms,
  head: () => ({
    meta: [
      { title: "Terms of Use | Verb Wise" },
      {
        name: "description",
        content:
          "The terms for using Verb Wise: free tier, the one-off £4.99 unlock, your licence, and governing law.",
      },
      { property: "og:title", content: "Terms of Use | Verb Wise" },
      { property: "og:description", content: "Free tier, the one-off unlock, your licence and governing law." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Terms() {
  return (
    <PageTransition>
      <PageHeader
        eyebrow="Legal"
        title="Terms of Use"
        description="The short version of what you can expect from us, and what we expect from you."
      />

      <div className="grid gap-5">
        <LegalSection title="Who provides this service">
          <p>Verb Wise is provided by Richard Wells, based in the United Kingdom. Contact: <a href="https://richard-wells.com" target="_blank" rel="noopener noreferrer">richard-wells.com</a>.</p>
        </LegalSection>

        <LegalSection title="What the app is">
          <p>
            Verb Wise provides educational Spanish language content — verb contrast cards and everyday sayings, with
            examples and notes. It is a study aid, not professional or certified language tuition.
          </p>
        </LegalSection>

        <LegalSection title="Free and paid tiers">
          <p>Ten cards are always available free of charge.</p>
          <p>
            A single one-off payment of £4.99 unlocks all content permanently. There is no subscription and no
            recurring charge.
          </p>
        </LegalSection>

        <LegalSection title="Your licence">
          <p>
            When you unlock the app you get a personal, non-commercial, non-transferable licence to use the content.
            It is for your own study.
          </p>
          <p>
            Copying, republishing, redistributing or reselling the content — in whole or in part — is not permitted.
          </p>
        </LegalSection>

        <LegalSection title="Availability">
          <p>
            The service is provided as-is. We make reasonable efforts to keep it available and accurate, but we cannot
            promise it will never be interrupted or that every example will suit every context or region.
          </p>
        </LegalSection>

        <LegalSection title="Payments and refunds">
          <p>
            Payment terms and your cancellation rights are set out in our{" "}
            <Link to="/refunds" className="font-semibold text-primary hover:underline">
              Refund Policy
            </Link>
            .
          </p>
        </LegalSection>

        <LegalSection title="Governing law">
          <p>These terms are governed by the laws of England and Wales.</p>
        </LegalSection>
      </div>
    </PageTransition>
  );
}
