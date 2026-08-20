/**
 * Server-only resolution of Cloudflare Worker environment bindings.
 *
 * Nitro's cloudflare-module handler exposes the per-request `env` in exactly
 * two places before the app runs:
 *   - `globalThis.__env__ = env`
 *   - `request.runtime.cloudflare.env` (on the augmented request)
 *
 * This module reads those (and `process.env` for local dev) once and returns
 * a plain, typed object that callers pass explicitly to the payment helpers.
 */

export type WorkerEnv = {
  STRIPE_MODE?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_TEST_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  VERBWISE_SUPABASE_URL?: string;
  VERBWISE_SUPABASE_SERVICE_ROLE_KEY?: string;
};

const BINDING_NAMES = [
  "STRIPE_MODE",
  "STRIPE_SECRET_KEY",
  "STRIPE_TEST_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "VERBWISE_SUPABASE_URL",
  "VERBWISE_SUPABASE_SERVICE_ROLE_KEY",
] as const;

type Bag = Record<string, unknown>;

function fromRequest(): Bag | undefined {
  try {
    // Imported lazily: only valid inside an active request context.
    const req = (
      globalThis as typeof globalThis & {
        __tanstackRequest__?: unknown;
      }
    ).__tanstackRequest__;
    void req;
  } catch {
    /* ignore */
  }
  return undefined;
}

function readBag(bag: Bag | undefined, name: string): string | undefined {
  const value = bag?.[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Resolve the Worker environment for the current request.
 *
 * Call this at the top of a server function handler or server route handler
 * and pass the result into the payment helpers.
 */
export async function resolveWorkerEnv(): Promise<WorkerEnv> {
  const sources: Bag[] = [];

  // 1. Nitro-augmented request (per-request bindings).
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest() as Request & {
      runtime?: { cloudflare?: { env?: Bag } };
    };
    const requestEnv = request.runtime?.cloudflare?.env;
    if (requestEnv) sources.push(requestEnv);
  } catch {
    // No active request context (or not running on Cloudflare).
  }
  void fromRequest;

  // 2. Global stash set by Nitro's cloudflare-module handler.
  const globalEnv = (globalThis as typeof globalThis & { __env__?: Bag }).__env__;
  if (globalEnv) sources.push(globalEnv);

  // 3. Local development / Node.
  if (typeof process !== "undefined" && process.env) {
    sources.push(process.env as unknown as Bag);
  }

  const env: WorkerEnv = {};
  for (const name of BINDING_NAMES) {
    for (const source of sources) {
      const value = readBag(source, name);
      if (value !== undefined) {
        (env as Record<string, string>)[name] = value;
        break;
      }
    }
  }

  console.info(
    "[env] bindings " +
      BINDING_NAMES.map(
        (name) => `${name}=${env[name] ? "present" : "missing"}`,
      ).join(" "),
  );

  return env;
}
