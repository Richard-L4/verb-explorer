import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/app/PageTransition";
import { PageHeader } from "@/components/app/PageHeader";
import { LegalSection } from "@/components/app/LegalSection";
export const Route = createFileRoute("/refunds")({
  component: Refunds,
  head: () => ({
    meta: [
      { title: "Refund Policy | Verb Wise" },
      {
        name: "description",
        content:
          "How refunds work for the one-off Verb Wise unlock, your cancellation rights, and your statutory rights.",
      },
      { property: "og:title", content: "Refund Policy | Verb Wise" },
      { property: "og:description", content: "Immediate supply, cancellation rights and your statutory protections." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
function Refunds() {
  return (
    <PageTransition>
      <PageHeader
        eyebrow="Legal"
        title="Refund Policy"
        description="What happens when you pay, and where you stand if something isn't right."
      />
      <div className="grid gap-5">
        <LegalSection title="Immediate access">
          <p>
            Verb Wise is digital content. It is supplied to you immediately once your payment goes through — there is
            nothing to ship and nothing to wait for.
          </p>
        </LegalSection>
        <LegalSection title="Your cancellation right">
          <p>
            At checkout you tick a box to confirm that access begins immediately, and that you accept you lose your
            14-day right to cancel once it does. That waiver is made under the Consumer Contracts (Information,
            Cancellation and Additional Charges) Regulations 2013.
          </p>
          <p>The Pay button stays disabled until you have ticked that box, so the choice is always yours.</p>
        </LegalSection>
        <LegalSection title="Refunds">
          <p>
            Because access is granted straight away, refunds are not offered as a matter of course once you have been
            given access to the full deck.
          </p>
        </LegalSection>
        <LegalSection title="Your statutory rights">
          <p>
            Your rights under the Consumer Rights Act 2015 are not affected. If the digital content is faulty, or does
            not match how it was described, contact <a href="https://richard-wells.com" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80">richard-wells.com</a> and we will look at a repair, replacement or refund as appropriate.
          </p>
        </LegalSection>
        <LegalSection title="Customers in the EU and EEA">
          <p>
            Similar rules apply to customers in the EU and EEA. If you have any questions about your rights, contact
            us at <a href="https://richard-wells.com" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80">richard-wells.com</a> and we will help.
          </p>
        </LegalSection>
      </div>
    </PageTransition>
  );
}
