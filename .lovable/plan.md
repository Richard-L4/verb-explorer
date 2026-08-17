# Make the site background = the V circle's background (visual test)

Goal: a quick look-and-see. Replace the page background with the same green→yellow gradient the "V" logo circle uses, so the whole site shares the V's colour. This is an experiment to look at, not a final design — we'll adjust (or revert) based on what it looks like.

## What changes

One change in `src/styles.css`, in the `@layer base` `body` rule:

- Replace the current `background-color` + three radial-glow `background-image` lines with the V circle's gradient:
  ```css
  background: var(--gradient-hero);
  background-attachment: fixed;
  ```
- Keep `color`, `font-family`, and `-webkit-font-smoothing` as-is.
- Remove (for this test) the radial green/yellow glow lines since the gradient now is the background.

`--gradient-hero` already exists: `linear-gradient(120deg, oklch(0.795 0.19 152) 0%, oklch(0.845 0.185 122) 55%, oklch(0.87 0.175 96) 100%)` — the exact gradient behind the "V".

Nothing else changes: card surfaces, text colours, green/yellow accents, components, layout, and functionality all stay exactly as they are. The `--background` token itself is not changed (only the `body` rendering uses the gradient for this test).

## Expected result & caveat

The page becomes a bright green-to-yellow gradient. Because cards stay dark-navy and most text is near-white, some areas will have low contrast over the bright background — that's expected for a "just see what it looks like" test. After viewing we can decide whether to keep, darken, or revert.

## Verify

Screenshot the home page after the edit so you can see the result immediately.
