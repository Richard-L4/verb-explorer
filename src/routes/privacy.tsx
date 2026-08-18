import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/app/PageTransition";
import { PageHeader } from "@/components/app/PageHeader";
import { LegalSection } from "@/components/app/LegalSection";

export const Route = createFileRoute("/privacy")({
  component: Privacy,
  head: () => ({
    meta: [
      { title: "Privacy Policy | Verb Wise" },
      {
        name: "description",
        content:
          "How Verb Wise handles your data: progress stored in your browser, no advertising, no selling of personal data.",
      },
      { property: "og:title", content: "Privacy Policy | Verb Wise" },
      { property: "og:description", content: "How Verb Wise handles your data, cookies and your UK GDPR rights." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Privacy() {
  return (
    <PageTransition>
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        description="Plain English: what we collect, why, and what you can ask us to do about it."
      />

      <div className="grid gap-5">
        <LegalSection title="Who is responsible">
          <p>
            Verb Wise is built and operated by Richard Wells, based in the United Kingdom. That makes Richard Wells the
            data controller for any personal data the app handles.
          </p>
          <p>You can reach us at [contact email].</p>
        </LegalSection>

        <LegalSection title="What we collect">
          <p>
            Your progress — cards studied, cards marked as learned and your favourites — is stored locally in your own
            browser. It never leaves your device unless you tell us otherwise.
          </p>
          <p>
            If a sign-in feature is added, we would collect your account email address so you can log back in and so we
            can link your purchase to you.
          </p>
          <p>There is no third-party advertising in Verb Wise, and no advertising or tracking profiles are built.</p>
        </LegalSection>

        <LegalSection title="What we never do">
          <p>We do not sell your personal data to third parties. We do not share it for marketing purposes.</p>
        </LegalSection>

        <LegalSection title="Our lawful basis (UK GDPR)">
          <p>
            Where we process personal data, we rely on performance of a contract — giving you the app and the content
            you paid for — and on our legitimate interest in running and improving a small, reliable service.
          </p>
        </LegalSection>

        <LegalSection title="Cookies and local storage">
          <p>
            We only use functional, essential storage: the browser storage that remembers your progress and whether
            you have unlocked the full deck. There are no tracking cookies and no advertising cookies.
          </p>
        </LegalSection>

        <LegalSection title="Your rights">
          <p>
            You have the right to ask for a copy of your personal data, to have it corrected, and to have it erased.
            Email [contact email] and we will respond as quickly as we reasonably can.
          </p>
          <p>
            You can also clear everything stored on your device yourself at any time from the Settings page.
          </p>
        </LegalSection>

        <LegalSection title="How long we keep things">
          <p>
            Progress data stays in your browser until you clear it. We do not keep server-side personal data beyond
            what is needed for your account and your purchase record.
          </p>
        </LegalSection>

        <LegalSection title="Complaints">
          <p>
            If you are unhappy with how we have handled your data, contact us first at [contact email]. You also have
            the right to complain to the UK Information Commissioner's Office.
          </p>
        </LegalSection>
      </div>
    </PageTransition>
  );
}
