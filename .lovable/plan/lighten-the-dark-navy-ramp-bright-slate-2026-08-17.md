# Lighten the dark navy ramp → "Bright slate"

Goal: keep the deep-navy + green/yellow identity, but lift the dark/background tones so the UI feels more open, vibrant and inviting. Green and yellow accents are untouched. This is a colour-token change only — no layout, component, or functionality changes.

## Chosen direction

User selected **Bright slate**: background `#234A6E`, card `#2E5780`, with the existing green `#3BDE7C` and yellow `#F7D21A` accents unchanged.

Converted to OKLCH:
- `#234A6E` → `oklch(0.399 0.076 249)`
- `#2E5780` → `oklch(0.447 0.082 250)`

## New dark ramp

The original ramp (background → border) is remapped onto the two chosen anchors so the internal lightness hierarchy and contrast between surfaces are preserved, just lifted. Chroma is raised ~2× to match the more saturated "slate-blue" character of the chosen pair; hue stays at ~249 (same navy family).

| Token | Current OKLCH | New OKLCH | Role |
|------|----------------|-----------|------|
| `--background` | `oklch(0.198 0.038 248)` | `oklch(0.399 0.076 249)` | page background |
| `--sidebar` | `oklch(0.223 0.038 249)` | `oklch(0.420 0.078 249)` | sidebar surface |
| `--card` / `--popover` | `oklch(0.253 0.038 249)` | `oklch(0.447 0.082 250)` | card surface |
| `--muted` | `oklch(0.29 0.036 249)` | `oklch(0.479 0.080 249)` | muted surface |
| `--secondary` | `oklch(0.305 0.038 249)` | `oklch(0.492 0.082 249)` | secondary dark surface |
| `--border` / `--input` | `oklch(0.35 0.036 249)` | `oklch(0.531 0.080 249)` | borders / inputs |
| `--sidebar-accent` | `oklch(0.305 0.038 249)` | `oklch(0.492 0.082 249)` | follows secondary |

Unchanged (kept exactly):
- `--primary` green `oklch(0.795 0.19 152)`
- `--accent` yellow `oklch(0.87 0.175 96)`
- `--success`, `--destructive`, `--ring`, all `--chart-*`, all `*-foreground` text colors, `--gradient-hero`.

## Gradient-soft stops (lifted to match)

The soft background gradient currently uses very dark stops; they're lifted through the same remap so they sit in the same family as the new background:

| Stop | Current | New |
|------|---------|-----|
| A | `oklch(0.293 0.045 250)` | `oklch(0.482 0.082 250)` |
| B | `oklch(0.229 0.038 249)` | `oklch(0.426 0.078 249)` |
| C | `oklch(0.243 0.05 262)` | `oklch(0.438 0.080 262)` |

## Shadows

Keep shadow base colors dark (`oklch(0.05 0.03 250)` family) so cards still read as lifted/elevated against the lighter navy. No change to shadow definitions.

## What changes in code

`src/styles.css` only — update the `--background`, `--sidebar`, `--card`, `--popover`, `--muted`, `--secondary`, `--border`, `--input`, and `--sidebar-accent` values in **both** the `:root` and `.dark` blocks, plus the three `--gradient-soft` stops. The `surface-panel` utility uses `--card` at 60% opacity so it updates automatically.

No other files touched. No component, layout, or behaviour changes.

## Verify

After the edit: build passes, preview loads, and a quick screenshot confirms the navy is visibly lighter/open while green and yellow accents and text contrast remain correct.
