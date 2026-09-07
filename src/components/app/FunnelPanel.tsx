import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Loader2 } from "lucide-react";
import { getFunnelCounts } from "@/lib/analytics.functions";
import { CREATOR_QUERY_VALUE } from "@/lib/access";
import type { AnalyticsEvent } from "@/lib/analytics";

const ROWS: { event: AnalyticsEvent; label: string }[] = [
  { event: "app_visit", label: "App visits" },
  { event: "trial_started", label: "Trials started" },
  { event: "reminder_7", label: "7-day reminder" },
  { event: "reminder_3", label: "3-day reminder" },
  { event: "reminder_2", label: "2-day reminder" },
  { event: "reminder_1", label: "1-day reminder" },
  { event: "trial_expired", label: "Trial expired" },
  { event: "checkout_started", label: "Checkout started" },
  { event: "purchase_completed", label: "Purchases completed" },
];

interface RepeatVisitor {
  label: string;
  visits: number;
  country: string | null;
  firstVisit: string;
  lastVisit: string;
  trialStart: string | null;
}

interface RepeatSummary {
  available: boolean;
  total: number;
  totalVisits: number;
  heavy: number;
  light: number;
  visitors: RepeatVisitor[];
  countries: { country: string; count: number }[];
}

type State =
  | { status: "loading" }
  | {
      status: "ready";
      counts: Record<string, number>;
      available: boolean;
      repeat: RepeatSummary;
    }
  | { status: "error" };

function shortDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function RepeatVisitorTable({ rows }: { rows: RepeatVisitor[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="py-2 pr-3 font-semibold">Visitor</th>
            <th className="py-2 pr-3 font-semibold">Visits</th>
            <th className="py-2 pr-3 font-semibold">Country</th>
            <th className="py-2 pr-3 font-semibold">First visit</th>
            <th className="py-2 pr-3 font-semibold">Last visit</th>
            <th className="py-2 font-semibold">Trial start</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => (
            <tr key={v.label} className="border-t border-border/70">
              <td className="py-2 pr-3 font-semibold">{v.label}</td>
              <td className="py-2 pr-3 tabular-nums">{v.visits}</td>
              <td className="py-2 pr-3">{v.country ?? "—"}</td>
              <td className="py-2 pr-3 tabular-nums">{shortDate(v.firstVisit)}</td>
              <td className="py-2 pr-3 tabular-nums">{shortDate(v.lastVisit)}</td>
              <td className="py-2 tabular-nums">{shortDate(v.trialStart)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


/** Creator-only funnel summary. Shows distinct anonymous device counts only. */
export function FunnelPanel() {
  const fetchCounts = useServerFn(getFunnelCounts);
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchCounts({ data: { key: CREATOR_QUERY_VALUE } });
        if (!cancelled) {
          setState({ status: "ready", counts: result.counts, available: result.available });
        }
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchCounts]);

  return (
    <section className="surface-card mt-6 p-6 sm:p-7">
      <h2 className="flex items-center gap-2.5 text-xl font-bold">
        <BarChart3 className="size-5 text-primary" aria-hidden="true" /> Funnel
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Distinct anonymous devices per event. No device identifiers, names or emails are shown.
      </p>

      {state.status === "loading" ? (
        <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading counts…
        </p>
      ) : state.status === "error" ? (
        <p className="mt-5 text-sm text-muted-foreground">Funnel data is unavailable right now.</p>
      ) : (
        <>
          {!state.available ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No analytics table found yet — run the trial_events migration to start collecting.
            </p>
          ) : null}
          <dl className="mt-5 grid gap-2 sm:grid-cols-2">
            {ROWS.map(({ event, label }) => (
              <div
                key={event}
                className="flex items-center justify-between rounded-xl border border-border/80 bg-background/30 px-4 py-3"
              >
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="font-display text-lg font-bold tabular-nums">
                  {state.counts[event] ?? 0}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}
