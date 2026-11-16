/*
 * Home page at /: index.tsx names the default page for its directory.
 * Combines public deck summaries with useLearner browser progress and links to study
 * routes; CardGrid and StatCard receive props (values passed from parent to child).
 */
import { useSubjunctive } from "@/hooks/use-subjunctive";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Brain, Heart, LayoutGrid, Quote, Search, Wand2, Shuffle, Sparkles, GraduationCap, BookOpen } from "lucide-react";
import { cards, cardCount } from "@/data/cards";
import { sayingCount } from "@/data/sayings";
import { SUBJUNCTIVE_TOTAL as completeEntryCount } from "@/data/subjunctive-public";
import { useLearner } from "@/hooks/use-learner";
import { useAccess } from "@/hooks/use-access";
import { PageTransition } from "@/components/app/PageTransition";
import { CardGrid } from "@/components/app/CardGrid";
import { StatCard } from "@/components/app/StatCard";
import { ProgressBar } from "@/components/app/ProgressBar";
import { HomeScreenHint } from "@/components/app/HomeScreenHint";

// createFileRoute connects this filename to its URL in the generated route tree.
export const Route = createFileRoute("/")({
  component: Home,
  // head supplies document titles and metadata, not visible page content.
  head: () => ({
    meta: [
      { title: "Verbs — Learn Spanish verb contrasts with cards" },
      {
        name: "description",
        content:
          "Intermediate Spanish learners: stop freezing on the verbs your textbook glossed over. Real examples, side-by-side contrasts, the notes that make it stick.",
      },
      { property: "og:title", content: "Verbs — Learn Spanish verb contrasts with cards" },
      {
        property: "og:description",
        content:
          "Intermediate Spanish learners: stop freezing on the verbs your textbook glossed over. Real examples, side-by-side contrasts, the notes that make it stick.",
      },
    ],
  }),
});

const quickLinks = [
  { to: "/browse", label: "Browse cards", description: "Every verb contrast in the deck", icon: LayoutGrid },
  { to: "/search", label: "Search", description: "Ask a question, or find a verb or example", icon: Search },
  { to: "/favourites", label: "Favourites", description: "Your saved cards", icon: Heart },
  { to: "/quiz", label: "Quiz", description: "Test yourself", icon: Brain },
] as const;

function Home() {
  // Re-render when the server swaps in full card content (trial or purchase).
  useSubjunctive();
  // This custom hook (a reusable React function) subscribes to browser-saved learner
  // state, so progress changes update this page without a manual refresh.
  const { studiedCount, learnedCount, progressPercent, recentCards, state } = useLearner();
  // Confirmed lifetime access (purchase or restore) hides the £14.99 price and its
  // purchase prompt only; the feature list below stays visible to everyone.
  const { unlocked, creator } = useAccess();
  const hasLifetimeAccess = unlocked || creator;

  return (
    <PageTransition>
      <section className="surface-card gradient-soft hairline-top relative overflow-hidden p-7 sm:p-12">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-primary/15 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-accent/10 blur-3xl"
        />
        <span className="relative inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          <Sparkles className="size-3.5" aria-hidden="true" /> Spanish verbs
        </span>
        <h1 className="relative mt-6 max-w-2xl text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl">
          <span className="gradient-text">Verbs</span>
        </h1>
        <p className="relative mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Confusing verb pairs, explained side by side with real examples and the notes that actually make the
          difference stick.
        </p>
        <p className="relative mt-4 max-w-xl text-base font-bold leading-snug text-foreground">
          Keep forgetting the rule?
        </p>
        <p className="relative mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
          <span className="gradient-text">Faster than Googling it or asking ChatGPT. Just open the app.</span>
        </p>
        <HomeScreenHint className="relative mt-3 max-w-xl text-xs text-muted-foreground/80" />
        <div className="relative mt-8 flex flex-wrap gap-3">
          <Link
            to="/browse"
            className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            Start studying
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <Link
            to="/search"
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-card/70 px-6 text-sm font-semibold backdrop-blur transition-colors hover:border-primary/40 hover:bg-secondary"
          >
            <Search className="size-4" aria-hidden="true" /> Search the deck
          </Link>
          <Link
            to="/random"
            className="gradient-hero inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-300 hover:-translate-y-0.5"
          >
            <Shuffle className="size-4" aria-hidden="true" /> Random Verbs
          </Link>

        </div>

        <div className="relative mt-8 rounded-3xl border-2 border-primary/70 bg-card/80 p-6 shadow-[var(--shadow-glow)] backdrop-blur sm:p-10">
          {hasLifetimeAccess ? null : (
            <p className="gradient-text text-5xl font-bold leading-none tracking-tight sm:text-6xl">£14.99</p>
          )}
          <h2 className="mt-4 max-w-2xl text-xl font-bold leading-snug text-foreground sm:text-2xl">
            One payment. Hundreds of examples. A lifetime of better Spanish.
          </h2>
          <ul className="mt-6 grid gap-3 text-sm leading-relaxed text-foreground sm:grid-cols-2 sm:text-base">
            {[
              "Designed for Spanish learners at A2–B2 level.",
              "100 confusing verb pairs explained.",
              "Thousands of contextual examples.",
              "Present and imperfect subjunctive lessons.",
              "Quizzes, sayings and practical explanations.",
              "Smart voice and text search – ask any question (in English or Spanish), spoken or written, and get an answer.",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {hasLifetimeAccess ? null : (
            <p className="mt-6 rounded-2xl bg-primary/10 px-4 py-3 text-sm font-bold leading-snug text-primary sm:text-base">
              £14.99. One payment. Lifetime access. No subscription.
            </p>
          )}
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            NB: Future membership and community features are separate and are not included in this purchase.
          </p>
        </div>
      </section>

      <section className="surface-card gradient-soft hairline-top relative mt-6 overflow-hidden p-7 sm:mt-8 sm:p-12">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-primary/15 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-accent/10 blur-3xl"
        />
        <span className="relative inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          <Wand2 className="size-3.5" aria-hidden="true" /> Wish, doubt, emotion
        </span>
        <h2 className="relative mt-6 max-w-2xl text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl">
          <span className="gradient-text">Subjunctive</span>
        </h2>
        <p className="relative mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {completeEntryCount} verb pairs in the present and the imperfect subjunctive, each with three triggers and
          nine graded examples from A2 to B2 — so you know exactly when "que" changes the verb.
        </p>
        <div className="relative mt-8 flex flex-wrap gap-3">
          <Link
            to="/subjunctive/present"
            className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            Present
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <Link
            to="/subjunctive/imperfect"
            className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            Imperfect
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <Link
            to="/random-subjunctive"
            className="gradient-hero inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-300 hover:-translate-y-0.5"
          >
            <Shuffle className="size-4" aria-hidden="true" /> Random Subjunctive
          </Link>
        </div>
      </section>

      <section className="surface-card gradient-soft hairline-top relative mt-6 overflow-hidden p-7 sm:mt-8 sm:p-12">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-primary/15 blur-3xl"
        />
        <span className="relative inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          <Brain className="size-3.5" aria-hidden="true" /> Test yourself
        </span>
        <h2 className="relative mt-6 max-w-2xl text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl">
          <span className="gradient-text">Quiz</span>
        </h2>
        <p className="relative mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Verbs, Present or Imperfect Subjunctive, or a Mix of all three — Easy, Medium and Hard questions with feedback on every answer.
        </p>
        <div className="relative mt-8 flex flex-wrap gap-3">
          <Link
            to="/quiz"
            className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            Start the quiz
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="surface-card gradient-soft hairline-top relative mt-6 overflow-hidden p-7 sm:mt-8 sm:p-12">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-accent/15 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-primary/10 blur-3xl"
        />
        <span className="relative inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          <Quote className="size-3.5" aria-hidden="true" /> How you'd actually say it
        </span>
        <h2 className="relative mt-6 max-w-2xl text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl">
          <span className="gradient-text">Sayings</span>
        </h2>
        <p className="relative mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {sayingCount} English expressions with Spanish equivalents — British, American and Canadian English.
        </p>
        <div className="relative mt-8 flex flex-wrap gap-3">
          <Link
            to="/sayings"
            className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            Explore sayings
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <Link
            to="/sayings"
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-card/70 px-6 text-sm font-semibold backdrop-blur transition-colors hover:border-primary/40 hover:bg-secondary"
          >
            <Search className="size-4" aria-hidden="true" /> Browse the deck
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Cards available" value={cardCount} hint="In the current dataset" />
        <StatCard icon={GraduationCap} label="Cards studied" value={studiedCount} hint="Opened at least once" />
        <StatCard icon={Brain} label="Marked as learned" value={learnedCount} />
        <StatCard icon={Heart} label="Favourites" value={state.favourites.length} />
      </section>

      <section className="surface-card hairline-top relative mt-8 overflow-hidden p-6 sm:p-7">
        <h2 className="text-xl font-bold">Your progress</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {learnedCount} of {cardCount} cards marked as learned.
        </p>
        <div className="mt-5">
          <ProgressBar value={progressPercent} label="Deck completion" />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold">Jump back in</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map(({ to, label, description, icon: Icon }, i) => (
            <motion.div key={to} whileHover={{ y: -4 }} transition={{ duration: 0.22, ease: "easeOut" }}>
              <Link
                to={to}
                className="surface-card group flex h-full flex-col gap-2 p-5 transition-[box-shadow,border-color] duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-lift)]"
              >
                <span className="mb-1 grid size-10 place-items-center rounded-xl border border-border/70 bg-secondary/60 text-primary transition-colors duration-300 group-hover:border-primary/40 group-hover:bg-primary/10">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="font-display font-bold tracking-tight">{label}</span>
                <span className="text-sm text-muted-foreground">{description}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{recentCards.length ? "Recently studied" : "Start with these"}</h2>
          <Link to="/browse" className="text-sm font-semibold text-primary hover:underline">
            View all
          </Link>
        </div>
        <CardGrid cards={(recentCards.length ? recentCards : cards).slice(0, 3)} />
      </section>

      <section className="surface-card gradient-soft mt-10 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div>
          <h2 className="text-lg font-bold">Track how you're doing</h2>
          <p className="mt-1 text-sm text-muted-foreground">Statistics gather your studied, learned and favourite cards.</p>
        </div>
        <Link
          to="/statistics"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full border border-border bg-card px-5 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-secondary"
        >
          <BarChart3 className="size-4" aria-hidden="true" /> Open statistics
        </Link>
      </section>
    </PageTransition>
  );
}
