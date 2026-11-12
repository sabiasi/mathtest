@AGENTS.md

# MathTest

A web app for school teachers in Georgia (the country) to create math tests,
quizzes and exams, then print them or export them as PDF to hand out in class.
Today teachers use Microsoft Word, where typing math is painful. MathTest must
make it fast and easy.

## Users

- School teachers, many not very technical. The UI must be simple, clean,
  forgiving, with big clear buttons and no jargon.
- UI language: **Georgian (ქართული) by default**, English second.
- The project owner is a beginner programmer learning through this project:
  explain new terms simply, explain errors and how they were debugged, and
  work phase by phase (plan → OK → build one phase → stop for review).

## Core features (built step by step)

1. **Test editor**: title, subject, grade, date, instructions, list of questions.
2. **Visual math toolbar**: buttons for fractions, powers, roots, sin/cos/tan,
   log, π, ≤ ≥ ≠ ±, × ÷, integrals, limits, matrices, Greek letters… Teachers
   click a button and type into the slots. No LaTeX knowledge needed.
3. **Question types**: multiple choice (A/B/C/D, correct one marked),
   true/false, short answer, open/long answer (blank lines for working),
   fill-in-the-blank, matching.
4. **Points** per question with an automatic total.
5. **Print / PDF** that looks like a professional printed exam on A4, plus a
   separate **answer key** version for the teacher.

## Phases

- [x] **Phase 0**: project setup, CLAUDE.md, Georgian layout, "My tests" home
  (empty state + create button), empty editor page, localStorage repository.
- [x] **Phase 1**: test header form (school, title, subject, grade, date,
  time, instructions, A/B/C/D or ა/ბ/გ/დ labels) with debounced autosave;
  add/duplicate/delete/drag-and-drop questions; question types multiple
  choice, true/false, short answer, open answer; points + total; home cards
  with edit/duplicate/delete.
  - Practice task left for the owner in `src/lib/questions.ts`: `totalPoints`
    (1 test fails until done, on purpose; printed totals show 0 until then).
    Don't implement it unless asked; give hints instead.
- [x] **Phase 2**: rich text (text + inline formulas) in question text, options
  and short answers (TipTap + MathLive); "ფორმულა" button + Alt+= (like Word);
  sticky math toolbar with 7 tabs and Georgian tooltips; read-only preview
  with static math.
- [x] **Phase 3 (print)**: `/print/[id]` with real A4 sheets, student version and
  answer key, font size / points / columns options, Print (print CSS) and
  Download PDF (headless Chrome via `/api/pdf`).
- [x] **Variants**: up to 6 variants (A = original order, B–F shuffled with a
  seeded, repeatable shuffle), per-question "lock options", variant badge on
  every paper, per-variant answer keys, "all variants" view/PDF with an
  answer table first, optional blank pages for double-sided printing.
- [x] **Images & grids**: several pictures per question (upload, paste, drop;
  resize; above/right), stored in IndexedDB; an answer grid (graph paper or
  coordinate plane, 5 mm squares, SVG) on any question; print + PDF support.
- [ ] **Next**: remaining question types: fill-in-the-blank and matching.
- [ ] Later: duplicate tests, backup import/export, templates, then accounts
  and cloud storage.

## Tech decisions

| Area | Decision |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 (configured in `src/app/globals.css`, no tailwind.config) |
| Font | Noto Sans Georgian via `next/font/google` (self-hosted at build time). Must also be used in print/PDF output. |
| Icons | lucide-react |
| Rich text | TipTap v3 (ProseMirror) with a custom inline `math` node (`src/features/math/MathNode.ts`) |
| Math input | MathLive `<math-field>` inside that node; our own toolbar (MathLive's keyboard and menu are hidden) |
| Math rendering | MathLive `convertLatexToMarkup` (same engine as input). Fonts/styles: `mathlive/fonts.css` + `mathlive/static.css` imported in `layout.tsx`, bundled and self-hosted; `MathfieldElement.fontsDirectory = null` |
| Storage | Tests in browser localStorage; pictures in IndexedDB (`lib/images/imageStore.ts`), referenced by id. No login yet. Accounts come later. |
| Print | Our own pagination (`src/lib/paginate.ts` + `usePrintLayout`) into fixed 210×297mm `.sheet`s; `@page { size: A4; margin: 0 }` |
| PDF | `POST /api/pdf` → puppeteer-core opens the same `/print` page (test injected into its localStorage) → `page.pdf()`. Chrome found by `findChrome()` / `CHROME_PATH`; hosting will need e.g. @sparticuz/chromium. No Chrome → 501 → client falls back to `window.print()` |
| Fonts | Noto Sans Georgian + Noto Sans (backup for №, Cyrillic…), both via next/font; math fonts from MathLive CSS. PDFs must embed only these. |
| Drag and drop | @dnd-kit (core + sortable), handle-only, keyboard accessible |
| Tests | Vitest + jsdom (`npm test`) |

Next.js 16 notes (see AGENTS.md: read `node_modules/next/dist/docs/` before
using unfamiliar APIs):
- `cacheComponents` is on. Client hooks that read the URL (`useParams`,
  `useSearchParams`) must sit inside `<Suspense>`, or the build fails.
- Route `params` are Promises; types like `LayoutProps<"/">` / `PageProps<…>`
  are generated by `next dev` / `next build` (so run one before `tsc`).
- Visited routes stay mounted but hidden (React `<Activity>`), so state survives
  back/forward navigation.

## Architecture and conventions

```
src/
  app/                  Routes only, kept tiny (page.tsx renders a feature view)
    page.tsx            /              → features/home/HomeView
    editor/[id]/page.tsx /editor/:id   → features/editor/EditorView
  features/<name>/      Page-level UI for one feature
  features/math/        RichTextInput (TipTap box), MathNode, MathToolbar + toolbarData,
                        MathEditingContext (which box is active), RichTextView (static), mathlive.ts
  components/           Shared UI (header, logo, language switch, ui/button)
  i18n/                 dictionaries.ts (ka + en text), language.ts (useT, useLanguage)
  features/editor/      EditorView → TestEditor (state + autosave), TestHeaderForm,
                        questions/ (QuestionList with dnd-kit, QuestionCard, one editor per type)
  features/print/       PrintView (controls + sheets), PrintBlocks (header, questions),
                        usePrintLayout (measure → paginate), downloadPdf
  app/api/pdf/route.ts  PDF generation; lib/server/chrome.ts finds/launches Chrome
  lib/paginate.ts       Pure page packing (never splits a question)
  lib/images/           imageStore (IndexedDB, resize, data URLs for PDF, clean-up), imageMath (pure)
  components/           … GridArea (SVG grid in mm), QuestionImageView (picture with fixed aspect ratio)
  lib/variants.ts       buildVariants(test) → [A (original), B…]; seededRandom + shuffle
  lib/richText.ts       RichText = [{type:"text"} | {type:"math", latex}] + conversions to/from TipTap docs
  lib/questions.ts      Pure helpers: create/duplicate/change type, totals, labels
  lib/storage/          types.ts, migrate.ts (normalizeTest), testsRepository.ts, useTests.ts
  lib/format.ts         Date formatting (Georgian by hand)
```

- **All user-visible text goes in `src/i18n/dictionaries.ts`** (Georgian first,
  English with the same keys). Never hard-code UI text in components.
- **Only `src/lib/storage/testsRepository.ts` touches localStorage for tests.**
  Components use `useTests()` / `useTest(id)` and the repository functions.
  Every saved test passes through `normalizeTest` (migrate.ts) on read: when
  adding a field, give it a default there so older saved tests keep working.
- Question text, options and short answers are `RichText` (our own format, not
  TipTap JSON). Formulas are stored as LaTeX. Use `RichTextInput` to edit and
  `RichTextView` to display. Exception to the dictionary rule: math toolbar
  tooltips live in `toolbarData.ts` (ka + en per button).
- Georgian schools write tg / ctg (not tan / cot) and ";" in intervals.
- Chrome has no Georgian `Intl` date data: use `src/lib/format.ts`, never
  `toLocaleDateString("ka-GE")`.
- Pages that read localStorage are client components; the server renders a
  "loading" state (snapshot `null`) to avoid hydration mismatches.
- Small, clearly described git commits. Run `npm test`, `npm run lint` and
  `npm run build` before committing.

## Gotchas learned the hard way

- MathLive only exists in the browser: import `MathfieldElement` via
  `loadMathLive()` (dynamic import), never at the top of a module.
  `convertLatexToMarkup` is fine to import normally (SSR build has it).
- Setting `mf.menuItems` before the math-field is mounted throws
  "Mathfield not mounted" and silently cancels the ProseMirror transaction.
  Set it in the `mount` event.
- ProseMirror's `state.selection` lags the DOM by a moment after arrow keys.
  Key handlers next to formulas read the DOM selection (`posAtDOM`).
- Toolbar buttons use `onMouseDown={preventDefault}` so focus stays in the box.
- After `npm install`, Turbopack's watcher can miss CSS edits; restart
  `npm run dev` if styles look stale.
- On macOS, Home/End don't move the caret in browsers; tests use Cmd+←/→.
- Turbopack keeps a disk cache in `.next/`; changes to `@theme` or next/font
  options were missed even after restarting. If output looks stale:
  stop the server, `rm -rf .next`, start again.
- next/font adds an Arial-based "… Fallback" face that claims every character,
  and Turbopack ignores `adjustFontFallback: false`. layout.tsx therefore
  builds the font list itself (`--font-georgian-only`, then `--font-fallback`).
- Unlayered CSS in globals.css beats Tailwind utilities (they live in
  `@layer utilities`); use inline styles or `!` when a utility must win.
- Print measurement: `[data-print-ready="true"]` is set only when the pages
  match the current data and fonts; the PDF route waits for it.
- Check which real font Chrome used: CDP `CSS.getPlatformFontsForNode`.
- Pictures keep their natural width/height in the test, and are shown with
  CSS `aspect-ratio`, so print layout can be measured before they load.
- The PDF route gets pictures as data URLs and injects them as
  `window.__MATHTEST_IMAGES__`; `getImageUrl` checks that first.
- Paste: if the clipboard has text too (e.g. from Word), paste text, not a picture.
- Async edits to a question (image upload) use `onPatch(fn)` so they apply to
  the newest version and don't overwrite text typed meanwhile.
- Browser tests: wait for a condition (`waitForFunction`), not a fixed time.
- Variants must stay repeatable: never use Math.random() for them; change the
  seed only via "Shuffle again" (it warns that printed papers won't match).
- The PDF route waits with `waitForFunction(..., { polling: 250 })`; puppeteer's
  `waitForSelector` missed the ready flag with many variants.
- PDFs are slow on `npm run dev` (30–45 s for all variants) because the dev
  server compiles on demand; production takes about 1 s. Measure speed on
  `next build && next start`.

## Commands

```bash
npm run dev     # start the dev server at http://localhost:3000
npm test        # run unit tests once (npm run test:watch to keep watching)
npm run lint    # check code style and common mistakes
npm run build   # production build (also type-checks)
```

## History

The previous project in this repo (DevPath) is preserved at git tag
`devpath-phase1`.
