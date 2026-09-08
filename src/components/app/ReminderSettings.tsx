import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { disableReminders, enableReminders, permissionState, pushSupported, syncReminderState } from "@/lib/push-client";
import { REMINDER_INVITE_KEY, writeFlag } from "@/lib/random-session";

/** Settings control for the optional once-a-day practice reminder. */
export function ReminderSettings() {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setSupported(pushSupported());
    void syncReminderState().then(setOn);
  }, []);

  const toggle = async () => {
    setBusy(true);
    setNote(null);
    if (on) {
      await disableReminders();
      setOn(false);
      writeFlag(REMINDER_INVITE_KEY, "declined");
    } else {
      const outcome = await enableReminders();
      if (outcome === "on") {
        setOn(true);
        writeFlag(REMINDER_INVITE_KEY, "granted");
      } else if (outcome === "denied") {
        setNote("Your browser is blocking notifications for Verb Wise. You can allow them in your browser settings.");
      } else {
        setNote("Reminders aren't available in this browser. Try adding Verb Wise to your home screen first.");
      }
    }
    setBusy(false);
  };

  return (
    <section className="surface-card mt-6 p-6 sm:p-7">
      <h2 className="flex items-center gap-2.5 text-xl font-bold">
        {on ? <Bell className="size-5 text-primary" aria-hidden="true" /> : <BellOff className="size-5 text-muted-foreground" aria-hidden="true" />}
        Daily reminders
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        One short reminder a day, around 6pm UK time, with a verb to practise. No email address or personal details are
        needed — you can turn it off here at any time.
      </p>

      {supported ? (
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          aria-pressed={on}
          className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-card/70 px-6 text-sm font-bold transition-colors hover:border-primary/40 hover:bg-secondary disabled:opacity-60"
        >
          {on ? "Turn reminders off" : "Turn reminders on"}
        </button>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">
          {permissionState() === "denied"
            ? "Notifications are blocked for Verb Wise in this browser."
            : "This browser can't show daily reminders. Adding Verb Wise to your home screen usually enables them."}
        </p>
      )}

      {note ? <p className="mt-3 text-sm text-foreground/85">{note}</p> : null}
    </section>
  );
}
