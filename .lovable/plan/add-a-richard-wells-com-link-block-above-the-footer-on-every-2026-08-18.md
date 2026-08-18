# Add a "richard-wells.com" link block above the footer on every page

## Goal
A centred, quarter-width pill link reading **"For more products visit richard-wells.com →"** sits on every page between the last content section and the footer. It matches the navbar tab pill styling and uses the same green (`text-primary`) arrow as the "Study →" links on cards. Clicking opens `https://richard-wells.com/` in a new tab. No changes to the footer, navbar, or any existing content.

## Single edit point
`src/components/app/AppShell.tsx` — the only file touched. It wraps every route (`<header>` + `<main>{children}</main>` + `<SiteFooter />`), so adding the block as the **last child of `<main>`** (right after `{children}`) puts it on every page automatically. No route file needs to change.

## Spacing (equal above and below)
`<main>` currently has `pb-24` (96px) of bottom padding before the footer. To get equal spacing:
- Give the new block `mt-24` (96px) so the gap above it (from the last content section) equals the gap below it (the existing `pb-24` to the footer).
- Centred with `mx-auto`.

## Visual style (matches navbar tabs)
From `AppShell.tsx`, the navbar tab pill is:
- Container: `rounded-full border border-border/70 bg-card/50 p-1 backdrop-blur`
- Link: `rounded-full px-3.5 py-2 text-sm font-medium min-h-11`

The new link reuses those exact tokens:
- `inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/50 px-5 py-3 text-sm font-medium backdrop-blur min-h-11 transition-all duration-200 hover:border-primary/40 hover:bg-secondary`
- Text: "For more products visit richard-wells.com"
- Arrow: `<ArrowRight className="size-4 text-primary" />` — `text-primary` is the same green (`oklch(0.795 0.19 152)`) used on the "Study →" links (`text-primary` in `VerbCardTile`).
- Width: quarter-page-width, centred — `max-w-[16rem]` (≈¼ of the 6xl content column) with `w-full` so it stays comfortable on mobile while narrowing on desktop.

## Behaviour / accessibility
- `<a href="https://richard-wells.com/" target="_blank" rel="noopener noreferrer">` — opens in a new tab.
- `aria-label="For more products visit richard-wells.com (opens in a new tab)"` for screen readers.
- No `prefetch` / not a router `<Link>` — it's an external site.

## Out of scope (not changing)
- Footer (`SiteFooter.tsx`), navbar (`nav-items.ts`, header markup), and all route/page content remain untouched.
- No new dependencies. `ArrowRight` is already imported in `VerbCardTile`; `AppShell` will add the `ArrowRight` import from `lucide-react` (already a project dependency).

## Verification
- Build passes.
- Playwright: visit `/` and `/browse`, confirm the pill link is centred above the footer, the arrow is green, and clicking opens `https://richard-wells.com/` in a new tab (target="_blank").
