# Strengthen verb description (side.core) text contrast

## Change

On the card detail route, each verb side renders its short explanatory description
(`side.core` — e.g. "Destination, purpose, recipient, deadline, or a surprising
contrast given the subject.") directly beneath the verb title. It currently uses
the muted/secondary colour.

Change its text colour from `text-muted-foreground` to `text-foreground` (strong,
high-contrast white) — the same treatment already applied to the example notes
(`ex.note`) in the previous step.

## Exact edit

File: `src/routes/card.$cardId.tsx`, line 87

Before:
```tsx
{side.core ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{side.core}</p> : null}
```

After:
```tsx
{side.core ? <p className="mt-3 text-sm leading-relaxed text-foreground">{side.core}</p> : null}
```

## Scope

- Applies to every verb card (all 43) because all render through this single line.
- No other rendering of `side.core` exists in the codebase (confirmed).
- Nothing else changes: wording, font size (`text-sm`), spacing (`mt-3`,
  `leading-relaxed`), layout, card design, examples, translations, or
  functionality are untouched.
- The page-level tagline (line 67) and the browse-tile tagline
  (`VerbCardTile.tsx:73`) are **not** changed — the request targets the
  per-side description beneath each verb title, not the page subtitle.
