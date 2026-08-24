/**
 * Single, server-only mechanism for reading runtime secrets.
 *
 * Different hosts expose Worker bindings differently:
 *  - Lovable's deployment (and local Node dev) populate `process.env`.
 *  - A plain Cloudflare Worker passes bindings as the `env` argument to
 *    `fetch`; `src/server.ts` stashes those on `globalThis.__env__`.
 *
 * Every secret read in the app must go through `readEnv` so that both
 * deployments behave identically. Never log or return the values.
 */

type EnvBag = Record<string, unknown>;

function globalEnv(): EnvBag | undefined {
  return (globalThis as typeof globalThis & { __env__?: EnvBag }).__env__;
}

export function readEnv(name: string): string | undefined {
  const fromProcess =
    typeof process !== "undefined" && process.env
      ? (process.env as unknown as EnvBag)[name]
      : undefined;
  if (typeof fromProcess === "string" && fromProcess.length > 0) return fromProcess;

  const fromGlobal = globalEnv()?.[name];
  if (typeof fromGlobal === "string" && fromGlobal.length > 0) return fromGlobal;

  return undefined;
}

/** Names-only presence report for diagnostics. Never includes values. */
export function envPresence(names: readonly string[]) {
  const g = globalEnv();
  return {
    hasProcessEnv: typeof process !== "undefined" && !!process.env,
    hasGlobalEnvStash: !!g,
    resolved: Object.fromEntries(names.map((n) => [n, Boolean(readEnv(n))])),
    processEnv: Object.fromEntries(
      names.map((n) => [
        n,
        Boolean(typeof process !== "undefined" && process.env && (process.env as unknown as EnvBag)[n]),
      ]),
    ),
    globalEnv: Object.fromEntries(names.map((n) => [n, Boolean(g?.[n])])),
  };
}
