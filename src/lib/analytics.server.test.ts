import { describe, expect, it, vi } from "vitest";
import { recordTrialEvent } from "./analytics.server";
import * as payments from "./payments.server";

function fakeDb() {
  const calls: { table: string; row: unknown; options: unknown }[] = [];
  const client = {
    from(table: string) {
      return {
        upsert: async (row: unknown, options: unknown) => {
          calls.push({ table, row, options });
          return { error: null };
        },
      };
    },
  };
  return { client, calls };
}

describe("recordTrialEvent", () => {
  it("writes to trial_events and ignores duplicates on (device, event, day)", async () => {
    const { client, calls } = fakeDb();
    const spy = vi.spyOn(payments, "getSupabaseAdmin").mockReturnValue(client as never);

    const ok = await recordTrialEvent({
      deviceId: "device-1234567",
      event: "purchase_completed",
    });

    expect(ok).toBe(true);
    expect(calls[0]!.table).toBe("trial_events");
    expect(calls[0]!.options).toEqual({
      onConflict: "device_id,event,occurred_on",
      ignoreDuplicates: true,
    });
    // A webhook retry writes the same conflict target, so no second row appears.
    expect(calls[0]!.row).toMatchObject({
      device_id: "device-1234567",
      event: "purchase_completed",
    });
    spy.mockRestore();
  });

  it("returns false instead of throwing when the table is missing", async () => {
    const spy = vi.spyOn(payments, "getSupabaseAdmin").mockReturnValue({
      from: () => ({
        upsert: async () => ({ error: { message: 'relation "trial_events" does not exist' } }),
      }),
    } as never);

    await expect(
      recordTrialEvent({ deviceId: "device-1234567", event: "app_visit" }),
    ).resolves.toBe(false);
    spy.mockRestore();
  });
});
