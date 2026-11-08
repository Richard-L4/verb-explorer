/**
 * "Ask me a question": a growing text box with optional dictation.
 * Typed and spoken questions go through the same local interpreter (lib/ask/engine),
 * which only receives the content this user is already allowed to see.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, HelpCircle, Mic, Send, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cards } from "@/data/cards";
import { useSubjunctive } from "@/hooks/use-subjunctive";
import { ask, MAX_QUESTION_LENGTH, type AskResult } from "@/lib/ask/engine";
import { createDictation, getRecognitionCtor, type DictationState } from "@/lib/ask/speech";

/** Badge text for each answer area returned by the engine. */
const AREA_LABEL = {
  verbs: "Verb pair",
  present: "Present subjunctive",
  imperfect: "Imperfect subjunctive",
  indicative: "Indicative",
} as const;

/**
 * Mounted on the Search page. Holds the question text, last result, dictation language
 * and microphone state. `useSubjunctive` supplies public or pass-unlocked entries, so the
 * engine never sees content this visitor is not entitled to.
 */
export function AskPanel() {
  const { entries, imperfect } = useSubjunctive();
  const data = useMemo(() => ({ cards, present: entries, imperfect }), [entries, imperfect]);
  const [text, setText] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [lang, setLang] = useState<"en-GB" | "es-ES">("en-GB");
  const [mic, setMic] = useState<DictationState>("idle");
  const [supported, setSupported] = useState(false);
  const dictation = useRef<{ stop(): void } | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setSupported(!!getRecognitionCtor()), []);
  useEffect(() => () => dictation.current?.stop(), []);
  // Grow the box with its content.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 420)}px`;
  }, [text]);

  /** Stops any dictation, then runs the local engine on the current text. */
  const submit = (q = text) => {
    dictation.current?.stop();
    setResult(ask(q, data));
  };

  /** Starts or stops dictation; new speech is appended to whatever is already typed. */
  const toggleMic = () => {
    if (mic === "listening") {
      dictation.current?.stop();
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) return setMic("unsupported");
    dictation.current = createDictation({
      Ctor,
      lang,
      initialText: text,
      onText: (t) => setText(t.slice(0, MAX_QUESTION_LENGTH)),
      onState: setMic,
    });
  };

  const listening = mic === "listening";

  return (
    <section className="surface-card mb-10 p-5 sm:p-7" aria-labelledby="ask-heading">
      <h2 id="ask-heading" className="font-display text-2xl font-semibold">Ask me a question</h2>
      <p className="mt-1 text-sm text-muted-foreground">Ask in English or Spanish. Just describe what you're trying to say.</p>

      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          ref={box}
          value={text}
          rows={3}
          maxLength={MAX_QUESTION_LENGTH}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          aria-label="Your question"
          placeholder="Ask anything about Spanish verbs or grammar..."
          className="w-full resize-none rounded-2xl border border-border bg-card/80 p-4 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={!text.trim()}>
            <Send className="size-4" /> Ask
          </Button>
          {supported ? (
            <>
              <Button type="button" variant={listening ? "destructive" : "outline"} onClick={toggleMic} aria-pressed={listening}>
                {listening ? <Square className="size-4" /> : <Mic className="size-4" />}
                {listening ? "Stop" : "Speak"}
              </Button>
              <div className="flex overflow-hidden rounded-full border border-border text-xs" role="group" aria-label="Speech language">
                {(["en-GB", "es-ES"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    disabled={listening}
                    onClick={() => setLang(l)}
                    aria-pressed={lang === l}
                    className={`px-3 py-1.5 ${lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {l === "en-GB" ? "English" : "Español"}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {text ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                dictation.current?.stop();
                setText("");
                setResult(null);
              }}
            >
              <X className="size-4" /> Clear
            </Button>
          ) : null}
          <span className="ml-auto text-xs text-muted-foreground">{text.length}/{MAX_QUESTION_LENGTH}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
          {listening && "Listening… speak naturally, pauses are fine. Press Stop when you're done."}
          {mic === "denied" && "Microphone access was blocked. Allow it in your browser settings, or type your question."}
          {mic === "error" && "Speech recognition stopped unexpectedly. Your text is kept — try again or keep typing."}
          {(mic === "unsupported" || !supported) && "Voice input isn't available in this browser — you can type, or use your keyboard's dictation."}
          {supported && mic === "idle" && "Speech is converted to text by your browser; Verb Wise never receives or stores audio."}
        </p>
      </form>

      {result ? <AskAnswer result={result} onPick={(q) => { setText(q); submit(q); }} /> : null}
    </section>
  );
}

function AskAnswer({ result, onPick }: { result: AskResult; onPick: (q: string) => void }) {
  if (result.kind === "empty")
    return <p className="mt-5 text-sm text-muted-foreground">Type or say a question first.</p>;
  if (result.kind === "clarify")
    return (
      <div className="mt-5 rounded-2xl border border-border p-4" aria-live="polite">
        <p className="flex items-center gap-2 font-medium"><HelpCircle className="size-4 text-primary" /> {result.question}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {result.options.map((o) => (
            <Button key={o.query} variant="outline" size="sm" onClick={() => onPick(o.query)}>{o.label}</Button>
          ))}
        </div>
      </div>
    );
  if (result.kind === "fallback")
    return (
      <div className="mt-5 rounded-2xl border border-border p-4" aria-live="polite">
        <p className="flex items-center gap-2 font-medium">{result.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{result.message}</p>
      </div>
    );
  if (result.kind === "nearest")
    return (
      <div className="mt-5 rounded-2xl border border-border p-4" aria-live="polite">
        <p className="flex items-center gap-2 font-medium"><HelpCircle className="size-4 text-primary" /> {result.title}</p>
        <ResolutionNotes result={result} />
        <ul className="mt-3 space-y-3">
          {result.options.map((o) => (
            <li key={o.link.label}>
              <p className="text-sm text-muted-foreground">{o.reason}</p>
              <Button asChild variant="outline" size="sm" className="mt-1">
                <Link to={o.link.to} params={o.link.params as never}>{o.link.label} <ArrowRight className="size-4" /></Link>
              </Button>
            </li>
          ))}
        </ul>
      </div>
    );
  return (
    <div className="mt-5 rounded-2xl border border-primary/40 bg-primary/5 p-5" aria-live="polite">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{AREA_LABEL[result.area]}</p>
      <p className="mt-1 font-medium">{result.headline}</p>
      {result.es ? (
        <p className="mt-3">
          <span className="font-display text-lg">{result.es}</span>
          {result.en ? <span className="block text-sm text-muted-foreground">{result.en}</span> : null}
        </p>
      ) : null}
      <p className="mt-3 text-sm text-muted-foreground">{result.why}</p>
      <ResolutionNotes result={result} />
          {result.extra && (
            <p className="mt-3 rounded-md border border-border bg-muted/40 p-3 text-sm">
              <span className="font-semibold">Additional explanation (not an original Verb Wise example): </span>
              {result.extra}
            </p>
          )}
      <Button asChild className="mt-4" size="sm">
        <Link to={result.link.to} params={result.link.params as never}>
          {result.link.label} <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}

/** Structured engine notes sit beside, never inside, the deck's own lesson copy. */
function ResolutionNotes({ result }: { result: Extract<AskResult, { kind: "answer" | "nearest" }> }) {
  return (
    <>
      {result.corrections?.map((correction) => (
        <div key={correction.original} className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          <p className="font-semibold">Did you mean “{correction.corrected}”?</p>
          <p className="mt-1 text-muted-foreground">{correction.explanation}</p>
        </div>
      ))}
      {result.unlisted?.map((item) => (
        <p key={`${item.term}-${item.verb}`} className="mt-3 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Not covered in the lesson pack: </span>
          {item.note}
        </p>
      ))}
      {result.distinction ? (
        <p className="mt-3 rounded-md border border-border bg-muted/40 p-3 text-sm">
          <span className="font-semibold">Verb or noun? </span>{result.distinction}
        </p>
      ) : null}
    </>
  );
}
