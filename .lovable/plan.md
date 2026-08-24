# Switch the managed Stripe integration to Live Mode

## Change
- Open Lovable’s secure **Update Stripe secret key** dialog for the existing managed integration.
- Replace the current test credential with the Stripe live secret key (`sk_live_…`) supplied directly in that secure dialog.
- Do not create a new Stripe connection and do not request or alter an `rk_…` restricted key.

## Verification
- Confirm the managed `STRIPE_SECRET_KEY` update is accepted by Lovable.
- Publish the app so the live deployment receives the updated managed credential.
- Run a new checkout and confirm Stripe creates a `cs_live_…` Checkout Session rather than `cs_test_…`.

## Important
- Existing `cs_test_…` sessions remain test sessions and cannot be converted; verification requires starting a new Checkout Session after the live credential is active and published.
- The live webhook endpoint must use its live `whsec_…` signing secret for successful post-payment processing. This plan does not replace that secret unless verification shows it is still configured for test mode.
