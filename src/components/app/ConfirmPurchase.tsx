import { RestorePurchase } from "./RestorePurchase";

/** Earlier buyers whose purchase couldn't be matched automatically confirm once by email. */
export function ConfirmPurchase() {
  return (
    <section className="surface-card border border-primary/25 p-6">
      <h2 className="text-lg font-bold">Confirm your purchase</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This browser has Verb Wise unlocked. To open the full Subjunctive, confirm your purchase once
        with the email you used at checkout.
      </p>
      <RestorePurchase />
    </section>
  );
}
