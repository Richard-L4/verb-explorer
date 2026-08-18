import { Link } from "@tanstack/react-router";

const legalLinks = [
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Use" },
  { to: "/refunds", label: "Refund Policy" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center text-xs tracking-wide text-muted-foreground sm:px-6">
        <p>© 2026 Richard Wells</p>
        <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          {legalLinks.map(({ to, label }, i) => (
            <span key={to} className="flex items-center gap-2">
              {i > 0 ? <span aria-hidden="true">·</span> : null}
              <Link to={to} className="transition-colors hover:text-foreground">
                {label}
              </Link>
            </span>
          ))}
        </nav>
      </div>
    </footer>
  );
}
