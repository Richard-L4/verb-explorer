import { describe, expect, it } from "vitest";
import { collectDeviceSignal } from "./device-signal";
import { parseTrialInput } from "./trial-input";

const device = {
  screen: "1920x1080", pixelRatio: "1.25", timezone: "Europe/London",
  language: "en", platform: "Linux x86_64", cores: "8", memory: "8", touch: "no-touch",
};

describe("bounded trial device validation", () => {
  it("preserves every legitimate device field byte-for-byte", () => {
    expect(parseTrialInput({ device })).toEqual({ device });
    const actual = collectDeviceSignal();
    expect(actual).not.toBeNull();
    expect(parseTrialInput({ device: actual })).toEqual({ device: actual });
  });

  it("accepts unavailable browser capabilities as empty strings", () => {
    const empty = Object.fromEntries(Object.keys(device).map((key) => [key, ""]));
    expect(parseTrialInput({ device: empty })).toEqual({ device: empty });
  });

  it("preserves absent/null device and optional test-device submissions", () => {
    expect(parseTrialInput({})).toEqual({});
    expect(parseTrialInput({ device: null })).toEqual({ device: null });
    expect(parseTrialInput({ testDevice: true })).toEqual({ testDevice: true });
    expect(parseTrialInput({ testDevice: false, device })).toEqual({ testDevice: false, device });
  });

  it.each(Object.keys(device))("rejects missing required device field %s", (key) => {
    const incomplete: Record<string, string> = { ...device };
    delete incomplete[key];
    expect(() => parseTrialInput({ device: incomplete })).toThrow();
  });

  it.each(Object.keys(device))("rejects non-string device field %s", (key) => {
    expect(() => parseTrialInput({ device: { ...device, [key]: 42 } })).toThrow();
  });

  it("rejects unexpected outer and device fields", () => {
    expect(() => parseTrialInput({ device, paid: true })).toThrow("Invalid trial input");
    expect(() => parseTrialInput({ device: { ...device, extra: "x" } })).toThrow("Invalid trial input");
  });

  it("rejects excessive entry counts without visiting later values", () => {
    const large: Record<string, unknown> = Object.fromEntries(
      Array.from({ length: 20_000 }, (_, i) => [`extra${i}`, 0]),
    );
    Object.defineProperty(large, "last", { enumerable: true, get() { throw new Error("visited late value"); } });
    expect(() => parseTrialInput({ device: large })).toThrow("Invalid trial input");
  });

  it("rejects excessive key lengths with a constant error message", () => {
    expect(() => parseTrialInput({ device: { ["x".repeat(100_000)]: "x" } })).toThrow("Invalid trial input");
  });

  it.each(Object.keys(device))("bounds the value length of %s", (key) => {
    const max = key === "timezone" || key === "platform" ? 128 : 32;
    expect(parseTrialInput({ device: { ...device, [key]: "x".repeat(max) } }).device?.[key as keyof typeof device]).toHaveLength(max);
    expect(() => parseTrialInput({ device: { ...device, [key]: "x".repeat(max + 1) } })).toThrow();
  });

  it("rejects large malformed arrays, values and outer objects", () => {
    expect(() => parseTrialInput({ device: Array(20_000).fill(0) })).toThrow();
    expect(() => parseTrialInput({ device: { ...device, timezone: "x".repeat(100_000) } })).toThrow();
    expect(() => parseTrialInput(Object.fromEntries(Array.from({ length: 20_000 }, (_, i) => [`x${i}`, 0])))).toThrow("Invalid trial input");
  });
});