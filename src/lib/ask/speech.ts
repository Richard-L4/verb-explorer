/**
 * Browser dictation for "Ask me a question", kept separate from interpretation.
 * Uses the browser's built-in speech recognition. Verb Wise never receives audio;
 * the browser vendor (e.g. Google in Chrome, Apple in Safari) may process it.
 * Browsers end sessions after silences; we restart until the user presses Stop,
 * keeping every final phrase so earlier text is never lost.
 */

/** Microphone status shown in the UI; "denied" means the user refused permission. */
export type DictationState = "idle" | "listening" | "denied" | "error" | "unsupported";

/** The small part of the Web Speech API we use; tests supply a fake with this shape. */
interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
export type RecognitionCtor = new () => RecognitionLike;

/** Returns the browser's recognition class (standard or webkit-prefixed), or null during SSR or when unsupported. */
export function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Hard stop after two minutes, so a forgotten microphone does not keep listening. */
export const MAX_DICTATION_MS = 120_000;

/**
 * Starts dictation and returns a controller with `stop()`.
 * `committed` holds finished phrases; interim words are shown but only kept once final.
 * On `onend` (browser silence timeout) a new session starts until Stop or the time limit.
 * `now` is injectable so tests can simulate the time limit.
 */
export function createDictation(opts: {
  Ctor: RecognitionCtor;
  lang: string;
  /** Text already in the box; dictation appends to it. */
  initialText: string;
  onText: (text: string) => void;
  onState: (s: DictationState) => void;
  now?: () => number;
}) {
  const now = opts.now ?? Date.now;
  let committed = opts.initialText.trimEnd();
  let stopped = false;
  let rec: RecognitionLike | null = null;
  const startedAt = now();

  const join = (a: string, b: string) => (a && b ? `${a} ${b.trim()}` : a || b.trim());

  const begin = () => {
    const r = new opts.Ctor();
    r.lang = opts.lang;
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]!;
        if (res.isFinal) committed = join(committed, res[0].transcript);
        else interim += res[0].transcript;
      }
      opts.onText(join(committed, interim));
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return; // pauses are normal; onend restarts
      stopped = true;
      opts.onState(e.error === "not-allowed" || e.error === "service-not-allowed" ? "denied" : "error");
    };
    r.onend = () => {
      opts.onText(committed);
      if (!stopped && now() - startedAt < MAX_DICTATION_MS) {
        begin();
        return;
      }
      if (!stopped) opts.onState("idle");
      stopped = true;
    };
    rec = r;
    try {
      r.start();
    } catch {
      stopped = true;
      opts.onState("error");
    }
  };

  opts.onState("listening");
  begin();
  return {
    stop() {
      if (stopped) return;
      stopped = true;
      rec?.stop();
      opts.onState("idle");
    },
  };
}
