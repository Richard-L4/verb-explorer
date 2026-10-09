import { Link, useLocation } from "@tanstack/react-router";
import { ChevronDown, Shuffle, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const options = [
  { to: "/random", label: "Random Verbs", icon: Shuffle },
  { to: "/random-subjunctive", label: "Random Subjunctive", icon: Sparkles },
] as const;

const activeCls =
  "bg-primary text-primary-foreground shadow-[var(--shadow-glow)] hover:bg-primary hover:text-primary-foreground";
const idleCls = "text-muted-foreground hover:bg-secondary/80 hover:text-foreground";

/** "Random" navigation item: a dropdown on desktop, two plain links in the mobile menu. */
export function RandomMenu({
  linkBase,
  vertical,
  onNavigate,
}: {
  linkBase: string;
  vertical?: boolean | undefined;
  onNavigate?: (() => void) | undefined;
}) {
  const { pathname } = useLocation();
  const active = options.some((o) => pathname === o.to);

  if (vertical) {
    return (
      <>
        {options.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(linkBase, "w-full", idleCls)}
            activeProps={{ className: activeCls }}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          linkBase,
          active ? activeCls : idleCls,
          "outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <Shuffle className="size-4 shrink-0" aria-hidden="true" />
        <span>Random</span>
        <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52 rounded-2xl p-1.5">
        {options.map(({ to, label, icon: Icon }) => (
          <DropdownMenuItem
            key={to}
            asChild
            className="min-h-11 cursor-pointer rounded-xl px-3 text-sm font-medium"
          >
            <Link to={to} onClick={onNavigate}>
              <Icon className="size-4 text-primary" aria-hidden="true" />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
