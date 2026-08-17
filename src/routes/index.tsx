import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Brain, Heart, LayoutGrid, Search, Sparkles, GraduationCap, BookOpen } from "lucide-react";
import { cards, cardCount } from "@/data/cards";
import { useLearner } from "@/hooks/use-learner";
import { PageTransition } from "@/components/app/PageTransition";
import { CardGrid } from "@/components/app/CardGrid";
import { StatCard } from "@/components/app/StatCard";
import { ProgressBar } from "@/components/app/ProgressBar";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Verbo — Learn Spanish verb contrasts with cards" },
      {
        name: "description",
        content:
          "Study tricky Spanish verb pairs like ser vs estar and por vs para with interactive cards, favourites and progress tracking.",
      },
      { property: "og:title", content: "Verbo — Learn Spanish verb contrasts with cards" },
      {
        property: "og:description",
        content: "Interactive Spanish verb cards with real examples, favourites and saved progress.",
      },
    ],
  }),
});

const quickLinks = [
  { to: "/browse", label: "Browse cards", description: "Every verb contrast in the deck", icon: LayoutGrid },
  { to: "/search", label: "Search", description: "Find a verb, meaning or example", icon: Search },
  { to: "/favourites", label: "Favourites", description: "Your saved cards", icon: Heart },
  { to: "/quiz", label: "Quiz", description: "Coming soon", icon: Brain },
] as const;

function Home() {
  const { studiedCount, learnedCount, progressPercent, recentCards, state } = useLearner();

  return (
    <PageTransition>
      <section className="surface-card gradient-soft relative overflow-hidden p-7 sm:p-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          <Sparkles className="size-3.5" aria-hidden="true" /> Spanish verbs
        </span>
        <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">Verbo</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Confusing verb pairs, explained side by side with real examples and the notes that actually make the
          difference stick.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to="/browse"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Start studying <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            to="/search"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-semibold transition-colors hover:bg-secondary"
          >
            <Search className="size-4" aria-hidden="true" /> Search the deck
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Cards available" value={cardCount} hint="In the current dataset" />
        <StatCard icon={GraduationCap} label="Cards studied" value={studiedCount} hint="Opened at least once" />
        <StatCard icon={Brain} label="Marked as learned" value={learnedCount} />
        <StatCard icon={Heart} label="Favourites" value={state.favourites.length} />
      </section>

      <section className="surface-card mt-8 p-6">
        <h2 className="text-xl font-semibold">Your progress</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {learnedCount} of {cardCount} cards marked as learned.
        </p>
        <div className="mt-5">
          <ProgressBar value={progressPercent} label="Deck completion" />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">Jump back in</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map(({ to, label, description, icon: Icon }, i) => (
            <motion.div key={to} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
              <Link
                to={to}
                className="surface-card flex h-full flex-col gap-2 p-5 transition-shadow hover:shadow-[var(--shadow-lift)]"
              >
                <Icon className="size-5 text-primary" aria-hidden="true" />
                <span className="font-medium">{label}</span>
                <span className="text-sm text-muted-foreground">{description}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{recentCards.length ? "Recently studied" : "Start with these"}</h2>
          <Link to="/browse" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <CardGrid cards={(recentCards.length ? recentCards : cards).slice(0, 3)} />
      </section>

      <section className="surface-card mt-8 flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Track how you're doing</h2>
          <p className="text-sm text-muted-foreground">Statistics gather your studied, learned and favourite cards.</p>
        </div>
        <Link
          to="/statistics"
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-border bg-card px-5 text-sm font-semibold transition-colors hover:bg-secondary"
        >
          <BarChart3 className="size-4" aria-hidden="true" /> Open statistics
        </Link>
      </section>
    </PageTransition>
  );
}
