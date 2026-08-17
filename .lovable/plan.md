# Strengthen example note text contrast

## Scope
A single CSS class change in `src/routes/card.$cardId.tsx` (the card detail route). No other files, wording, layout, spacing, or functionality change.

## Change
The explanatory note paragraph rendered beneath each language example (the `ex.note` field) currently uses `text-muted-foreground`, which reads as muted blue-grey against the dark navy background.

Line 101 today:
```tsx
{ex.note ? <p className="mt-2 pl-5 text-sm leading-relaxed text-muted-foreground">{ex.note}</p> : null}
```

Replace `text-muted-foreground` with `text-foreground` so the note renders as strong, high-contrast white (foreground is already the near-white `oklch(0.965 ...)` token).

Result:
```tsx
{ex.note ? <p className="mt-2 pl-5 text-sm leading-relaxed text-foreground">{ex.note}</p> : null}
```

## What stays the same
- Spanish examples (`ex.es`) — unchanged style.
- English translations (`ex.en`) — unchanged style.
- The "Tricky bit" paragraph (a separate section) — unchanged.
- Wording, spacing, layout, functionality — unchanged.

## Verification
- Load `/card/por-vs-para` and confirm the `ex.note` text (e.g. "The action is aimed at you as its destination...") renders bright white against the navy card background.
- Confirm Spanish and English example text are visually unchanged.
