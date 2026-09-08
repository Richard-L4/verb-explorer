/**
 * Browser side of the daily reminders. Everything technical stays in here so
 * the UI only ever deals with "on", "off" and "not possible".
 */
import { getPushPublicKey, removePushSubscription, savePushSubscription } from "./push.functions";

export const REMINDERS_ON_KEY = "vw_daily_reminders_v1";

export type ReminderOutcome = "on" | "denied" | "unsupported" | "failed";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function permissionState(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

export function remindersOn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(REMINDERS_ON_KEY) === "1";
  } catch {
    return false;
  }
}

function setRemindersOn(value: boolean) {
  try {
    window.localStorage.setItem(REMINDERS_ON_KEY, value ? "1" : "0");
  } catch {
    /* storage unavailable */
  }
}

function urlBase64ToUint8Array(value: string): Uint8Array {
  const padded = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function keyToBase64(buffer: ArrayBuffer | null): string | null {
  if (!buffer) return null;
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function readyRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (!existing) return null;
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

/** Asks for permission (if needed) and registers this browser for reminders. */
export async function enableReminders(): Promise<ReminderOutcome> {
  if (!pushSupported()) return "unsupported";

  try {
    const permission =
      Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") {
      setRemindersOn(false);
      return permission === "denied" ? "denied" : "failed";
    }

    const registration = await readyRegistration();
    if (!registration) return "unsupported";

    const { publicKey } = await getPushPublicKey();
    if (!publicKey) return "unsupported";

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      }));

    const p256dh = keyToBase64(subscription.getKey("p256dh"));
    const auth = keyToBase64(subscription.getKey("auth"));
    if (!p256dh || !auth) return "failed";

    const saved = await savePushSubscription({
      data: { endpoint: subscription.endpoint, p256dh, auth },
    });
    if (!saved.ok) return "failed";

    setRemindersOn(true);
    return "on";
  } catch {
    return "failed";
  }
}

/** Turns reminders off and stops future delivery to this browser. */
export async function disableReminders(): Promise<void> {
  setRemindersOn(false);
  try {
    const registration = await readyRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    await removePushSubscription({ data: { endpoint: subscription.endpoint } });
    await subscription.unsubscribe().catch(() => false);
  } catch {
    /* nothing further to do */
  }
}

/** Keeps the stored flag honest if permission was revoked at OS/browser level. */
export async function syncReminderState(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== "granted") {
    if (remindersOn()) setRemindersOn(false);
    return false;
  }
  return remindersOn();
}
