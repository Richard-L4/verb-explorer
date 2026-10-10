import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { motion } from "framer-motion";
import { useQuiz } from "@/hooks/use-quiz";
import { Paywall } from "@/components/app/Paywall";
import { quizLevelLocked } from "@/lib/content-access";
import {
  answer,
  isFinished,
  newRound,
  next,
  quizPool,
  saveBest,
  type QuizCategory,
  type QuizDifficulty,
  type Round,
} from "@/lib/quiz-session";
import { cn } from "@/lib/utils";

const CATEGORIES: { id: QuizCategory; label: string }[] = [
  { id: "verbs", label: "Verbs" },
  { id: "subjunctive", label: "Subjunctive" },
  { id: "mix", label: "Mix" },
];
const DIFFICULTIES: QuizDifficulty[] = ["easy", "medium", "hard"];

// Same tones as the Subjunctive difficulty badges.
const difficultyTone: Record<QuizDifficulty, string> = {
  easy: "border-primary/30 bg-primary/10 text-primary",
  medium: "border-accent/35 bg-accent/12 text-accent",
  hard: "border-border bg-secondary text-foreground",
};

export function QuizPlayer() {
  const { tier, questions, checking } = useQuiz();
  const [category, setCategory] = useState<QuizCategory>("verbs");
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("easy");
  const pool = useMemo(() => quizPool(questions, category, difficulty), [questions, category, difficulty]);
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const [round, setRound] = useState<Round>(() => ({ order: [], index: 0, score: 0, answered: null }));

  // A new choice (or newly authorised questions) starts a new round.
  useEffect(() => {
    setRound(newRound(pool));
  }, [pool]);

  const locked = quizLevelLocked(category, difficulty, tier);
  const finished = round.order.length > 0 && isFinished(round);
  const current = !finished ? byId.get(round.order[round.index] ?? "") : undefined;

  useEffect(() => {
    if (finished) saveBest(`${category}:${difficulty}`, round.score, round.order.length);
  }, [finished, category, difficulty, round.score, round.order.length]);

  return (
    <div>
      <div role="tablist" aria-label="Quiz category" className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={category === c.id}
            onClick={() => setCategory(c.id)}
            className={cn(
              "min-h-11 rounded-full border px-5 text-sm font-semibold transition-colors",
              category === c.id
                ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                : "border-border bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div role="radiogroup" aria-label="Difficulty" className="mt-4 flex flex-wrap gap-2">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            role="radio"
            aria-checked={difficulty === d}
            onClick={() => setDifficulty(d)}
            className={cn(
              "min-h-10 rounded-full border px-4 text-[11px] font-bold uppercase tracking-[0.12em] transition-opacity",
              difficultyTone[d],
              difficulty === d ? "ring-2 ring-primary/60 ring-offset-2 ring-offset-background" : "opacity-70 hover:opacity-100",
            )}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {locked && !checking ? (
          <Paywall title="Unlock every quiz level" />
        ) : pool.length === 0 ? (
          <div className="surface-card p-6 text-sm text-muted-foreground" role="status">
            {checking ? "Loading questions…" : "No questions are available for this choice yet. Try another level or tab."}
          </div>
        ) : finished ? (
          <div className="surface-card gradient-soft hairline-top p-7 text-center sm:p-10" role="status">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Round complete</p>
            <h2 className="mt-3 font-display text-3xl font-bold">
              {round.score} / {round.order.length}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">You've answered every question in this round.</p>
            <button
              onClick={() => setRound(newRound(pool))}
              className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)]"
            >
              <RotateCcw className="size-4" aria-hidden="true" /> Restart
            </button>
          </div>
        ) : current ? (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="surface-card hairline-top p-6 sm:p-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
              <span>
                Question {round.index + 1} of {round.order.length}
              </span>
              <span>Score {round.score}</span>
            </div>
            <h2 className="mt-4 text-lg font-bold leading-snug sm:text-xl">{current.question}</h2>
            <ul className="mt-5 grid gap-3">
              {current.options.map((o, i) => {
                const chosen = round.answered === i;
                const reveal = round.answered !== null;
                return (
                  <li key={i}>
                    <button
                      disabled={reveal}
                      onClick={() => setRound((r) => answer(r, i, o.correct))}
                      className={cn(
                        "flex min-h-12 w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                        !reveal && "border-border bg-card/60 hover:border-primary/50 hover:bg-secondary",
                        reveal && o.correct && "border-primary bg-primary/10 text-foreground",
                        reveal && chosen && !o.correct && "border-destructive bg-destructive/10",
                        reveal && !chosen && !o.correct && "border-border/60 opacity-60",
                      )}
                    >
                      {reveal && o.correct ? (
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-label="Correct answer" />
                      ) : reveal && chosen ? (
                        <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Your answer" />
                      ) : (
                        <span className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      )}
                      <span>{o.text}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {round.answered !== null ? (
              <div className="mt-5" role="status">
                <p
                  className={cn(
                    "text-sm font-bold",
                    current.options[round.answered]?.correct ? "text-primary" : "text-destructive",
                  )}
                >
                  {current.options[round.answered]?.correct ? "Correct" : "Not quite"}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {current.options[round.answered]?.feedback}
                </p>
                <button
                  onClick={() => setRound((r) => next(r))}
                  className="group mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)]"
                >
                  {round.index + 1 < round.order.length ? "Next question" : "See score"}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
