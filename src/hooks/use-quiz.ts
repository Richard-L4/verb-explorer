import { useEffect, useState } from "react";
import publicQuiz from "@/data/quiz.public.json";
import type { QuizQuestion } from "@/lib/quiz-public-build";
import type { QuizTier } from "@/lib/content-access";
import { getQuizQuestions } from "@/lib/quiz.functions";
import { readContentPass } from "@/lib/content-pass-store";
import { useSubjunctive } from "@/hooks/use-subjunctive";

/** Questions the server authorised. Starts with the public 20 until the server answers. */
export function useQuiz() {
  const sub = useSubjunctive(); // resolves/refreshes the signed pass
  const [state, setState] = useState<{ tier: QuizTier; questions: QuizQuestion[]; checking: boolean }>({
    tier: "public",
    questions: publicQuiz as QuizQuestion[],
    checking: true,
  });

  useEffect(() => {
    if (sub.status === "checking") return;
    let live = true;
    getQuizQuestions({ data: { pass: readContentPass() } })
      .then((res) => {
        if (!live) return;
        setState({
          tier: res.questions ? res.tier : "public",
          questions: res.questions ?? (publicQuiz as QuizQuestion[]),
          checking: false,
        });
      })
      .catch(() => live && setState((s) => ({ ...s, checking: false })));
    return () => {
      live = false;
    };
  }, [sub.status]);

  return state;
}
