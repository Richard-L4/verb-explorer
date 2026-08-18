import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, type ReactNode } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { navItems } from "./nav-items";
import { SiteFooter } from "./SiteFooter";
import { cn } from "@/lib/utils";

const linkBase =
  "relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200 min-h-11 sm:min-h-0";

function NavLinks({ onNavigate, vertical }: { onNavigate?: () => void; vertical?: boolean }) {
  return (
    <>
      {navItems.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          activeOptions={{ exact: to === "/" }}
          className={cn(
            linkBase,
            vertical && "w-full",
            "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
          )}
          activeProps={{
            className:
              "bg-primary text-primary-foreground shadow-[var(--shadow-glow)] hover:bg-primary hover:text-primary-foreground",
          }}
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="group flex min-w-0 items-center gap-2.5" onClick={() => setOpen(false)}>
            <span className="gradient-hero flex size-9 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-300 group-hover:-rotate-6">
              V
            </span>
            <span className="truncate font-display text-lg font-bold tracking-tight">Verb Wise</span>
          </Link>

          <nav
            aria-label="Main"
            className="hidden items-center gap-1 rounded-full border border-border/70 bg-card/50 p-1 backdrop-blur lg:flex"
          >
            <NavLinks />
          </nav>

          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card/60 text-foreground transition-colors hover:bg-secondary lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.nav
              aria-label="Mobile"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="overflow-hidden border-t border-border/70 lg:hidden"
            >
              <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
                <NavLinks vertical onNavigate={() => setOpen(false)} />
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 pb-24 sm:px-6 sm:py-12">
        {children}
        <div className="mx-auto mt-24 flex w-full max-w-[16rem] justify-center">
          <a
            href="https://richard-wells.com/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="For more products visit richard-wells.com (opens in a new tab)"
            className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary px-5 py-3 text-sm font-semibold text-black transition-all duration-200 hover:brightness-95"
          >
            <span className="text-center leading-tight">
              For more products visit richard-wells.com
            </span>
            <ArrowRight
              className="size-4 shrink-0 text-black transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </a>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
