/** Shared app layout: wraps page children with navigation, prompts and the footer. React hooks manage the mobile menu and visit tracking; smaller components handle their own messages. */
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, ChevronDown, Menu, MoreHorizontal, X } from "lucide-react";
import { Link as RouterLink, useLocation } from "@tanstack/react-router";
import { buyItem, navItems } from "./nav-items";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SiteFooter } from "./SiteFooter";
import { InstallBanner } from "./InstallBanner";
import { TrialBanner } from "./TrialBanner";
import { PostStudyPanel } from "./PostStudyPanel";
import { PromoPopup } from "./PromoPopup";
import { RandomMenu } from "./RandomMenu";
import { Fragment } from "react";
import { logAppVisit } from "@/lib/analytics";
import { useAccess } from "@/hooks/use-access";
import { cn } from "@/lib/utils";


const linkBase =
  "relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200 min-h-11 sm:min-h-0 lg:max-2xl:px-3 lg:max-2xl:[&>svg:first-child]:hidden";

// Destructuring takes named props from the parent's object.
// onNavigate lets mobile links ask AppShell to close its menu.
function NavLinks({ onNavigate, vertical }: { onNavigate?: () => void; vertical?: boolean }) {
  return (
    <>
      {/* map turns navigation data into elements; stable keys help React match them across renders. */}
      {navItems.filter((i) => vertical || !("more" in i)).map(({ to, label, icon: Icon }) => (
        <Fragment key={to}>
        <Link
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
        {to === "/sayings" ? (
          <RandomMenu linkBase={linkBase} vertical={vertical} onNavigate={onNavigate} />
        ) : null}
        </Fragment>
      ))}
      {vertical ? null : <MoreMenu />}
    </>
  );
}

const activeCls =
  "bg-primary text-primary-foreground shadow-[var(--shadow-glow)] hover:bg-primary hover:text-primary-foreground";

/** Desktop "More" dropdown for less-used pages (Favourites, Statistics, Settings) so the bar never overflows. */
function MoreMenu() {
  const { pathname } = useLocation();
  const items = navItems.filter((i) => "more" in i);
  const active = items.some((i) => pathname === i.to);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          linkBase,
          active ? activeCls : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <MoreHorizontal className="size-4 shrink-0" aria-hidden="true" />
        <span>More</span>
        <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52 rounded-2xl p-1.5">
        {items.map(({ to, label, icon: Icon }) => (
          <DropdownMenuItem key={to} asChild className="min-h-11 cursor-pointer rounded-xl px-3 text-sm font-medium">
            <RouterLink to={to}>
              <Icon className="size-4 text-primary" aria-hidden="true" />
              {label}
            </RouterLink>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Highlighted Buy It Now button linking to the existing Unlock page. Hidden once lifetime access is confirmed. */
function BuyLink({ onNavigate, vertical }: { onNavigate?: () => void; vertical?: boolean }) {
  const { unlocked, creator } = useAccess();
  const Icon = buyItem.icon;
  if (unlocked || creator) return null;
  return (
    <Link
      to={buyItem.to}
      onClick={onNavigate}
      className={cn(
        "gradient-hero inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform duration-200 hover:-translate-y-0.5 lg:min-h-0",
        vertical && "w-full",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span>{buyItem.label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  // Anonymous, once-per-day visit event. Analytics only.
  useEffect(() => {
    void logAppVisit();
  }, []);


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

          <div className="flex shrink-0 items-center gap-2">
          <span className="hidden lg:inline-flex"><BuyLink /></span>

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
        </div>

        {/* State controls whether the menu exists; AnimatePresence lets its exit animation finish. */}
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
              <div className="mx-auto flex max-h-[calc(100dvh-4.5rem)] max-w-6xl flex-col gap-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6">
                <BuyLink vertical onNavigate={() => setOpen(false)} />
                <NavLinks vertical onNavigate={() => setOpen(false)} />
              </div>
            </motion.nav>
          )}
        </AnimatePresence>

        <InstallBanner />
      </header>

      <PromoPopup />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 pb-24 sm:px-6 sm:py-12">
        <PostStudyPanel />
        <TrialBanner />
        {children}
        <div className="mx-auto mt-24 flex w-full max-w-[16rem] justify-center">
          <a
            href="https://richard-wells.com/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="For more products visit richard-wells.com (opens in a new tab)"
            className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary px-5 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-white"
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
