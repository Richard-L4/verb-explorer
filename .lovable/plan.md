# Nudge the navy background toward the logo's yellowy-green → "Navy-teal"

Goal: keep the deep, sophisticated dark feel and the same lightness hierarchy, but shift the page background and card surfaces from pure greyish-blue navy toward the yellowy-green used in the "V" logo circle. The result is a navy-teal — mostly navy with a warm teal-green undertone. Vibrant green (`#3BDE7C`) and bright yellow (`#F7D21A`) accents are untouched. Colour-token change only — no layout, component, or functionality changes.

## Chosen direction

User selected **Navy-teal (subtle)**: background `#004F6B`, card `#005D7B`, green `#3BDE7C`, yellow `#F7D21A` unchanged.

## How the mix works

The yellowy-green logo colour sits at OKLCH hue ≈122; the current slate-navy background sits at hue ≈249. A perceptual mix lands in the teal family, which reads too bright/light as a page background. Instead we keep the background's existing lightness (`L = 0.399`) and depth, and only rotate hue from ~249 toward ~229 (a −20° shift toward green) with a small chroma lift (+0.006) so the green undertone is clearly felt but the surface stays deep. The whole dark ramp shifts together so the internal lightness hierarchy between background → sidebar → card → muted → secondary → border is preserved, just teal-leaning instead of blue-leaning.

## New dark ramp (applied to `:root` and `.dark`)

| Token | Current OKLCH | New OKLCH | New HEX |
|------|----------------|-----------|---------|
| `--background` | `oklch(0.399 0.076 249)` | `oklch(0.399 0.082 229)` | `#004F6A` |
| `--sidebar` | `oklch(0.420 0.078 249)` | `oklch(0.420 0.084 229)` | `#005571` |
| `--card` / `--popover` | `oklch(0.447 0.082 250)` | `oklch(0.447 0.088 230)` | `#005D7C` |
| `--muted` | `oklch(0.479 0.080 249)` | `oklch(0.479 0.086 229)` | `#176684` |
| `--secondary` | `oklch(0.492 0.082 249)` | `oklch(0.492 0.088 229)` | `#196A89` |
| `--sidebar-accent` | `oklch(0.492 0.082 249)` | `oklch(0.492 0.088 229)` | `#196A89` |
| `--border` / `--input` | `oklch(0.531 0.080 249)` | `oklch(0.531 0.086 229)` | `#2B7594` |

Unchanged (kept exactly):
- `--primary` green `oklch(0.795 0.19 152)`
- `--accent` yellow `oklch(0.87 0.175 96)`
- `--success`, `--destructive`, `--ring`, all `--chart-*`, all `*-foreground` text colours, `--gradient-hero`.
- All `--sidebar-*` primary/accent/border/ring tokens that mirror the above.

## Gradient-soft stops (shifted to match)

The soft background gradient stops are rotated by the same −20° hue shift with the +0.006 chroma lift so they sit in the new teal-navy family:

| Stop | Current | New |
|------|---------|-----|
| A | `oklch(0.482 0.082 250)` | `oklch(0.482 0.088 230)` |
| B | `oklch(0.426 0.078 249)` | `oklch(0.426 0.084 229)` |
| C | `oklch(0.438 0.080 262)` | `oklch(0.438 0.086 242)` |

## Shadows

Shadow base colours stay dark navy (`oklch(0.05 0.03 250)` family) so cards still read as lifted/elevated against the teal-navy. No change to shadow definitions.

## Body radial glows

The `body` background-image radial glows use green and yellow at low opacity — these are accents and stay unchanged. They will sit naturally on the new teal-navy.

## What changes in code

`src/styles.css` only — update the `--background`, `--sidebar`, `--card`, `--popover`, `--muted`, `--secondary`, `--sidebar-accent`, `--border`, and `--input` values in **both** the `:root` and `.dark` blocks, plus the three `--gradient-soft` stops. The `surface-panel` utility uses `--card` at 60% opacity so it updates automatically.

Also update the `surface-panel` utility's hardcoded `oklch(0.447 0.082 250 / 0.6)` literal to `oklch(0.447 0.088 230 / 0.6)` so the glassmorphism panel matches the new card colour.

No other files touched. No component, layout, or behaviour changes.

## Verify

After the edit: build passes, preview loads, and a quick screenshot confirms the navy now has a visible teal-green undertone while green and yellow accents and text contrast remain correct.
