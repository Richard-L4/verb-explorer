/**
 * Shared trial-request validation, depending on Zod, a runtime shape checker.
 * Reject unknown device keys before schema parsing so oversized malformed records
 * cannot produce an unbounded list of validation issues. Keep all eight fields.
 */
import { z } from "zod";

// All eight fields are always emitted by collectDeviceSignal(). Empty strings
// are legitimate when a browser cannot expose an optional capability.
const deviceShape = {
  screen: z.string().max(32),
  pixelRatio: z.string().max(32),
  timezone: z.string().max(128),
  language: z.string().max(32),
  platform: z.string().max(128),
  cores: z.string().max(32),
  memory: z.string().max(32),
  touch: z.string().max(32),
};

export const trialInputSchema = z.object({
  testDevice: z.boolean().optional(),
  device: z.object(deviceShape).strict().nullable().optional(),
}).strict();

const deviceFields = new Set(Object.keys(deviceShape));
const inputFields = new Set(["testDevice", "device"]);

function checkFields(value: unknown, fields: Set<string>): void {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return;
  // Stop at the first unexpected key, before Zod's strict-object validator
  // collects unknown keys or formats a potentially huge validation error.
  for (const key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key) || !fields.has(key)) {
      throw new Error("Invalid trial input");
    }
  }
}

export function parseTrialInput(input: unknown) {
  checkFields(input, inputFields);
  if (input !== null && typeof input === "object" && "device" in input) {
    checkFields(input.device, deviceFields);
  }
  return trialInputSchema.parse(input);
}