/**
 * Add-to-home-screen awareness helpers.
 * Captures beforeinstallprompt as early as possible and stores the
 * one-time contextual reminder state in localStorage.
 */

export const REMINDER_KEY = "vw_home_screen_reminder_v1";

export type InstallMode = "android" | "ios" | "desktop";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeInstallPrompt(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getDeferredPrompt() {
  return deferredPrompt;
}

export function initInstallPromptCapture() {
  if (typeof window === "undefined") return;
  const w = window as unknown as { __vwInstallCaptureReady?: boolean };
  if (w.__vwInstallCaptureReady) return;
  w.__vwInstallCaptureReady = true;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    markReminderDone();
    emit();
  });
}

export async function triggerInstallPrompt(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const prompt = deferredPrompt;
  if (!prompt) return "unavailable";
  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    return outcome;
  } catch {
    return "dismissed";
  } finally {
    deferredPrompt = null;
    emit();
  }
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.("(display-mode: standalone)").matches === true;
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = /Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;
  return iOS || iPadOS;
}

export function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac/.test(navigator.userAgent);
}

export function isReminderDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(REMINDER_KEY) !== null;
  } catch {
    return false;
  }
}

export function markReminderDone() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REMINDER_KEY, "done");
  } catch {
    /* ignore */
  }
}
