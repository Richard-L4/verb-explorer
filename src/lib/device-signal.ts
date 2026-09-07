/**
 * Browser-side device signal used only for trial anti-abuse.
 *
 * These are stable, non-personal characteristics that every website already
 * receives in normal operation. Nothing is stored in the browser, nothing is
 * sent to a third party, and the server keeps only a salted one-way hash.
 *
 * Deliberately excluded: canvas/font/WebGL probing, IP address, any account
 * or contact detail, any advertising identifier.
 */

export interface DeviceSignal {
  screen: string;
  pixelRatio: string;
  timezone: string;
  language: string;
  platform: string;
  cores: string;
  memory: string;
  touch: string;
}

function safe(fn: () => string | number | undefined | null): string {
  try {
    const value = fn();
    return value === undefined || value === null ? "" : String(value);
  } catch {
    return "";
  }
}

/** Collects the signal. Returns null outside the browser. */
export function collectDeviceSignal(): DeviceSignal | null {
  if (typeof window === "undefined" || typeof navigator === "undefined") return null;

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    userAgentData?: { platform?: string };
  };

  return {
    // Screen size is rounded to reduce accidental churn from OS zoom levels.
    screen: safe(() => {
      const w = Math.max(window.screen.width, window.screen.height);
      const h = Math.min(window.screen.width, window.screen.height);
      return `${w}x${h}`;
    }),
    pixelRatio: safe(() => Math.round((window.devicePixelRatio ?? 1) * 100) / 100),
    timezone: safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone),
    language: safe(() => (navigator.language ?? "").split("-")[0]),
    platform: safe(() => nav.userAgentData?.platform ?? navigator.platform),
    cores: safe(() => navigator.hardwareConcurrency),
    memory: safe(() => nav.deviceMemory),
    touch: safe(() => (navigator.maxTouchPoints ?? 0) > 0),
  };
}
