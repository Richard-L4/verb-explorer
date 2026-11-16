/**
 * Server-only choice of Stripe live or test mode, decided by the website address
 * the request arrived on. Production addresses only ever use live credentials;
 * preview addresses and localhost only ever use test credentials. Anything else,
 * or a missing/mismatched credential, fails closed — never falls back.
 */
import { isLovablePreviewHost } from "./preview";

export type StripeMode = "live" | "test";

export const STRIPE_LIVE_HOSTS: readonly string[] = [
  "verb-wise.richard-wells.com",
  "verb-wise-flashcards.lovable.app",
];

/** Current Verb Wise prices used for new checkouts. */
export const VERB_WISE_LIVE_PRICE_ID = "price_1U66oMJ7wpJmIRgYHaLwO2VH";
export const VERB_WISE_TEST_PRICE_ID = "price_1U6FgVQsnncBlv2AE3WrorZp";

/**
 * Prices still honoured when verifying a paid session, so earlier purchases and
 * open checkout sessions keep working after the current price changes.
 */
const ACCEPTED_PRICE_IDS: Record<StripeMode, readonly string[]> = {
  live: [VERB_WISE_LIVE_PRICE_ID],
  test: [VERB_WISE_TEST_PRICE_ID],
};

export class StripeConfigError extends Error {}

/** Mode for a hostname taken from the server's own request URL (never a forwarding header). */
export function stripeModeForHost(hostname: string | null | undefined): StripeMode {
  const host = (hostname ?? "").trim().toLowerCase();
  if (STRIPE_LIVE_HOSTS.includes(host)) return "live";
  if (host === "localhost" || host === "127.0.0.1" || isLovablePreviewHost(host)) return "test";
  throw new StripeConfigError("Payments are not available on this address");
}

export interface StripeConfig {
  mode: StripeMode;
  secretKey: string;
  priceId: string;
  acceptedPriceIds: readonly string[];
  webhookSecret: string | undefined;
  webhookSecretName: string;
}

type Env = (name: string) => string | undefined;

/** Reads only the chosen mode's settings; the other mode's key is never consulted. */
export function stripeConfigForMode(mode: StripeMode, env: Env): StripeConfig {
  const keyName = mode === "live" ? "STRIPE_SECRET_KEY" : "STRIPE_SECRET_KEY_TEST";
  const webhookSecretName = mode === "live" ? "STRIPE_WEBHOOK_SECRET" : "STRIPE_TEST_WEBHOOK_SECRET";
  const secretKey = env(keyName);
  if (!secretKey) throw new StripeConfigError(`${keyName} is not configured for ${mode} payments`);
  const prefixes = mode === "live" ? ["sk_live_", "rk_live_"] : ["sk_test_", "rk_test_"];
  if (!prefixes.some((p) => secretKey.startsWith(p))) {
    throw new StripeConfigError(`${keyName} is not a ${mode}-mode Stripe key`);
  }
  return {
    mode,
    secretKey,
    priceId: mode === "live" ? VERB_WISE_LIVE_PRICE_ID : VERB_WISE_TEST_PRICE_ID,
    acceptedPriceIds: ACCEPTED_PRICE_IDS[mode],
    webhookSecret: env(webhookSecretName),
    webhookSecretName,
  };
}

/** Hostname of a trusted request URL (the Worker's own `request.url`). */
export function hostOfRequestUrl(url: string): string {
  return new URL(url).hostname;
}

/** Config for the request currently being handled by a server function. */
export async function currentStripeConfig(): Promise<StripeConfig> {
  const { getRequest } = await import("@tanstack/react-start/server");
  const { readEnv } = await import("./env.server");
  return stripeConfigForMode(stripeModeForHost(hostOfRequestUrl(getRequest().url)), readEnv);
}

/** Config for a raw HTTP route that receives the Request directly. */
export async function stripeConfigForRequest(request: Request): Promise<StripeConfig> {
  const { readEnv } = await import("./env.server");
  return stripeConfigForMode(stripeModeForHost(hostOfRequestUrl(request.url)), readEnv);
}
