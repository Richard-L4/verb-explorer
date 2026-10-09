import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ANALYTICS_EVENTS } from "./analytics";

const eventSchema = z.object({
  deviceId: z.string().min(8).max(128),
  event: z.enum(ANALYTICS_EVENTS),
  trialDay: z.number().int().min(0).max(365).nullable().optional(),
  occurredOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  /** Creator/developer test traffic — rejected server-side. */
  testDevice: z.boolean().optional(),
});

/** Records one anonymous funnel event. Always resolves, never throws. */
export const logTrialEvent = createServerFn({ method: "POST" })
  .inputValidator((input) => eventSchema.parse(input))
  .handler(async ({ data }) => {
    const { recordTrialEvent } = await import("./analytics.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    let host: string | null = null;
    try {
      host = new URL(getRequest().url).hostname;
    } catch {
      host = null;
    }
    const recorded = await recordTrialEvent({
      deviceId: data.deviceId,
      event: data.event,
      trialDay: data.trialDay ?? null,
      occurredOn: data.occurredOn ?? null,
      testDevice: data.testDevice === true,
      host,
    });
    return { recorded };
  });


/**
 * Creator-only aggregate read. Gated by a server-verified creator pass, so the
 * funnel is not a public endpoint. Returns distinct device counts only.
 */
export const getFunnelCounts = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ pass: z.string().max(2048) }).parse(input))
  .handler(async ({ data }) => {
    const { passRole } = await import("./content-pass.server");
    const { buildChecks } = await import("./content-checks.server");
    // Creator pass only — a purchase pass never opens the funnel.
    if ((await passRole(data.pass, await buildChecks())) !== "creator") {
      throw new Error("Forbidden");
    }
    const { getFunnelCountsFromDb, getRepeatVisitorsFromDb } = await import(
      "./analytics.server"
    );
    const [funnel, repeatVisitors] = await Promise.all([
      getFunnelCountsFromDb(),
      getRepeatVisitorsFromDb(),
    ]);
    return { ...funnel, repeatVisitors };
  });
