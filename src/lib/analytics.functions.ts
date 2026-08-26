import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ANALYTICS_EVENTS } from "./analytics";
import { CREATOR_QUERY_VALUE } from "./access";

const eventSchema = z.object({
  deviceId: z.string().min(8).max(128),
  event: z.enum(ANALYTICS_EVENTS),
  trialDay: z.number().int().min(0).max(365).nullable().optional(),
  occurredOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/** Records one anonymous funnel event. Always resolves, never throws. */
export const logTrialEvent = createServerFn({ method: "POST" })
  .inputValidator((input) => eventSchema.parse(input))
  .handler(async ({ data }) => {
    const { recordTrialEvent } = await import("./analytics.server");
    const recorded = await recordTrialEvent({
      deviceId: data.deviceId,
      event: data.event,
      trialDay: data.trialDay ?? null,
      occurredOn: data.occurredOn ?? null,
    });
    return { recorded };
  });

/**
 * Creator-only aggregate read. Gated by the existing creator key, so the
 * funnel is not a public endpoint. Returns distinct device counts only.
 */
export const getFunnelCounts = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ key: z.string() }).parse(input))
  .handler(async ({ data }) => {
    if (data.key !== CREATOR_QUERY_VALUE) {
      throw new Error("Forbidden");
    }
    const { getFunnelCountsFromDb } = await import("./analytics.server");
    return getFunnelCountsFromDb();
  });
