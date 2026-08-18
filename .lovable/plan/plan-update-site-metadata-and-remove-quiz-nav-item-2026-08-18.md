# Plan: Update site metadata and remove Quiz nav item

## Head metadata — `src/routes/__root.tsx`

Update the `head()` meta array:

1. **Meta description** → change `content` to:
   `Intermediate Spanish learners: stop freezing on the verbs your textbook glossed over. Real examples, side-by-side contrasts, the notes that make it stick.`
2. **og:description** → same new text as the meta description above.
3. **og:title** → keep equal to the existing page title (`Verbs — Spanish verb cards`). Already matches; no change.
4. **twitter:site** → change `@Lovable` to `@Richard_Wells79`.

Leave the title, og:type, twitter:card, fonts, icon, and links untouched.

## Navigation — `src/components/app/nav-items.ts`

Remove the Quiz entry:
```
{ to: "/quiz", label: "Quiz", icon: Brain },
```
and drop the now-unused `Brain` import from lucide-react. Keep the rest of the nav array and ordering intact.

The `/quiz` route file (`src/routes/quiz.tsx`) stays in place — only the nav link is removed.

## Verification

After edits, run the typecheck (auto by the harness) and confirm via a quick preview check that:
- The home page `<head>` reflects the new description, og:description, and `@Richard_Wells79`.
- The navbar no longer shows a "Quiz" tab.
