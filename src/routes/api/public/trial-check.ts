import { createFileRoute } from "@tanstack/react-router";
import { getRequestIP } from "@tanstack/react-start/server";

/**
 * TEMPORARY, read-only trial diagnostic.
 *
 * Reports what the live trial-entitlement logic WOULD decide for this request.
 * It never inserts a grant, never issues a cookie and never records analytics,
 * so it cannot create or consume a trial.
 *
 * It returns booleans and counts only: no IP address, no hash, no cookie value,
 * no credentials.
 */
export const Route = createFileRoute("/api/public/trial-check")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { TRIAL_COOKIE, NETWORK_GRANT_ALLOWANCE, hashToken, hashNetwork } = await import(
          "@/lib/trial.server"
        );

        const cookieHeader = request.headers.get("cookie") ?? "";
        const cookiePresent = cookieHeader
          .split(";")
          .some((part) => part.trim().startsWith(`${TRIAL_COOKIE}=`));

        let address: string | null = null;
        try {
          address = getRequestIP({ xForwardedFor: true }) ?? null;
        } catch {
          address = null;
        }
        const networkHash = hashNetwork(address);
        const networkResolvable = networkHash !== null;

        const report = {
          buildStamp: "trial-check-v1",
          host: new URL(request.url).host,
          cookiePresent,
          networkResolvable,
          networkHeaderPresent: {
            xForwardedFor: request.headers.get("x-forwarded-for") !== null,
            cfConnectingIp: request.headers.get("cf-connecting-ip") !== null,
            xRealIp: request.headers.get("x-real-ip") !== null,
          },
          networkGrantAllowance: NETWORK_GRANT_ALLOWANCE,
          grantsTableReachable: false,
          totalGrants: null as number | null,
          knownVisitor: false,
          matchingGrantsForNetwork: null as number | null,
          wouldGrantNewTrial: null as boolean | null,
          wouldReportIsNew: null as boolean | null,
          pathTaken: "fallback" as "server" | "fallback",
        };

        try {
          const { getSupabaseAdmin } = await import("@/lib/payments.server");
          const db = getSupabaseAdmin();

          const total = await db
            .from("trial_grants")
            .select("id", { count: "exact", head: true });
          if (total.error) return json(report);
          report.grantsTableReachable = true;
          report.totalGrants = total.count ?? 0;

          // Primary identity: does this request's cookie match a known grant?
          if (cookiePresent) {
            const raw = cookieHeader
              .split(";")
              .map((p) => p.trim())
              .find((p) => p.startsWith(`${TRIAL_COOKIE}=`));
            const value = raw ? decodeURIComponent(raw.slice(TRIAL_COOKIE.length + 1)) : "";
            if (value) {
              const { data, error } = await db
                .from("trial_grants")
                .select("id")
                .eq("token_hash", hashToken(value))
                .maybeSingle();
              if (error) return json(report);
              report.knownVisitor = data !== null;
            }
          }

          if (report.knownVisitor) {
            report.matchingGrantsForNetwork = null;
            report.wouldGrantNewTrial = false;
            report.wouldReportIsNew = false;
            report.pathTaken = "server";
            return json(report);
          }

          // Secondary signal: how many grants already share this network?
          let matching = 0;
          if (networkHash) {
            const { count, error } = await db
              .from("trial_grants")
              .select("id", { count: "exact", head: true })
              .eq("network_hash", networkHash);
            if (error) return json(report);
            matching = count ?? 0;
          }
          report.matchingGrantsForNetwork = networkHash ? matching : null;

          const repeat = networkHash !== null && matching >= NETWORK_GRANT_ALLOWANCE;
          // A new grant row would be written either way; the difference is
          // whether it inherits an existing clock (repeat) or starts a fresh one.
          report.wouldGrantNewTrial = !repeat;
          report.wouldReportIsNew = !repeat;
          report.pathTaken = "server";
          return json(report);
        } catch {
          return json(report);
        }
      },
    },
  },
});

function json(body: unknown) {
  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
