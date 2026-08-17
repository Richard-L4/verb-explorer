import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, AlertTriangle, Quote } from "lucide-react";
import { getSaying, getSayingNeighbours, getSayingIndex, sayingCount } from "@/data/sayings";
import { useLearner } from "@/hooks/use-learner";
import { PageTransition } from "@/components/app/PageTransition";
import { FavouriteButton } from "@/components/app/FavouriteButton";
import { LearnedButton } from "@/components/app/LearnedButton";

export const Route = createFileRoute("/saying/$sayingId")({
  loader: ({ params }) => {
    const saying = getSaying(params.sayingId);
    if (!saying) throw notFound();
    return { saying };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Saying not found | Verbs" }, { name: "robots", content: "noindex" }] };
    }
    const { saying } = loaderData;
    const description = saying.vibe ?? `How to say "${saying.title}" naturally in Spanish.`;
    return {
      meta: [
        { title: `${saying.title} — in natural Spanish | Verbs` },
        { name: "description", content: description.slice(0, 155) },
        { property: "og:title", content: `${saying.title} — in natural Spanish | Verbs` },
        { property: "og:description", content: description.slice(0, 155) },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: SayingDetail,
});

function SayingDetail() {
  const { saying } = Route.useLoaderData();
  const { isFavourite, isLearned, toggleFavourite, toggleLearned, markViewed } = useLearner();
  const { prev, next } = getSayingNeighbours(saying.id);
  const position = getSayingIndex(saying.id) + 1;

  useEffect(() => {
    markViewed(saying.id);
  }, [saying.id, markViewed]);

  return (
    <PageTransition>
      <Link
        to="/sayings"
        className="group inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-1" aria-hidden="true" /> Back
        to sayings
      </Link>

      <header className="surface-card gradient-soft hairline-top relative mt-4 overflow-hidden p-6 sm:p-9">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary/12 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {saying.category ? <span className="text-primary">{saying.category}</span> : null}
          <span className="tabular-nums">
            Saying {position} of {sayingCount}
          </span>
        </div>
        <h1 className="relative mt-4 text-balance text-4xl font-bold leading-[1.02] sm:text-5xl">{saying.title}</h1>
        {saying.vibe ? (
          <p className="relative mt-4 max-w-3xl text-base leading-relaxed text-foreground sm:text-lg">{saying.vibe}</p>
        ) : null}

        <div className="relative mt-7 flex flex-wrap gap-3">
          <FavouriteButton
            withText
            active={isFavourite(saying.id)}
            label={saying.title}
            onToggle={() => toggleFavourite(saying.id)}
          />
          <LearnedButton active={isLearned(saying.id)} label={saying.title} onToggle={() => toggleLearned(saying.id)} />
        </div>
      </header>

      {saying.literal_fail ? (
        <section className="surface-card mt-6 border-accent/35 bg-accent/8 p-6 sm:p-7">
          <h2 className="flex items-center gap-2.5 text-lg font-bold">
            <span className="grid size-9 place-items-center rounded-xl border border-accent/35 bg-accent/12 text-accent">
              <AlertTriangle className="size-4.5" aria-hidden="true" />
            </span>
            Literal translation trap
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/85">{saying.literal_fail}</p>
        </section>
      ) : null}

      {saying.examples?.length ? (
        <section className="mt-6">
          <h2 className="mb-4 text-xl font-bold">Say it like this</h2>
          <div className="grid gap-5 lg:grid-cols-2">
            {saying.examples.map((ex, i) => (
              <motion.article
                key={`${ex.es}-${i}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, delay: Math.min(i * 0.06, 0.3), ease: [0.22, 1, 0.36, 1] }}
                className="surface-card hairline-top relative overflow-hidden p-6 sm:p-7"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Context</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/80">{ex.context}</p>

                <p className="mt-4 flex items-start gap-2 font-display text-xl font-bold leading-snug text-primary">
                  <Quote className="mt-1.5 size-3.5 shrink-0 text-accent" aria-hidden="true" />
                  <span lang="es">{ex.es}</span>
                </p>

                {ex.note ? <p className="mt-3 pl-5 text-sm leading-relaxed text-foreground">{ex.note}</p> : null}
              </motion.article>
            ))}
          </div>
        </section>
      ) : null}

      <nav aria-label="Saying navigation" className="mt-8 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link
            to="/saying/$sayingId"
            params={{ sayingId: prev.id }}
            className="surface-card group flex min-h-16 items-center gap-3 p-4 transition-[box-shadow,border-color] duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-lift)]"
          >
            <ArrowLeft
              className="size-4 shrink-0 text-primary transition-transform duration-300 group-hover:-translate-x-1"
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Previous</span>
              <span className="block truncate font-display font-bold">{prev.title}</span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to="/saying/$sayingId"
            params={{ sayingId: next.id }}
            className="surface-card group flex min-h-16 items-center justify-end gap-3 p-4 text-right transition-[box-shadow,border-color] duration-300 hover:border-primary/40 hover:shadow-[var(--shadow-lift)]"
          >
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Next</span>
              <span className="block truncate font-display font-bold">{next.title}</span>
            </span>
            <ArrowRight
              className="size-4 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        ) : null}
      </nav>
    </PageTransition>
  );
}