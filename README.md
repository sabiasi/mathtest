# MathTest

A Georgian-first test and exam builder for school teachers, with English UI
support. Eight subject toolkits include rich text, formulas, diagrams, images,
repeatable variants, answer keys, A4 printing, and PDF export.

Teachers can try all subjects as guests. Account holders choose their teaching
subjects after their first sign-in: Free has one active subject; Premium,
School, and active Premium trials support multiple subjects. Settings manages
subjects and the default subject. Assignments are separate from administrator
permissions and enforced by database policies.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Public pages and guest editing work without Supabase.
Account features require the public Supabase settings described in `.env.example`.
Use `.env.local` for local overrides; never put secrets in committed env files.

## Database setup — required for account subject access

No database changes are applied automatically by the app.

The simplest way, for a new OR an existing project: in Supabase's SQL Editor run
`supabase/schema.sql`, then `supabase/plans.sql`. The full schema contains every
migration below. It is safe to rerun and does not delete existing tests,
profiles, pictures, or subscriptions. (`plans.sql` fails with "relation
public.plan_limits does not exist" if `schema.sql` hasn't been run first.)

If your database already has the plan tables, you can instead run only the new
parts, in order:

1. `supabase/plans.sql` — enables the multiple-subject feature for paid plans.
2. `supabase/migrations/20261114_teaching_subjects.sql` — assignments, selection
   function, and subject-based write policies.
3. `supabase/migrations/20261115_plan_preview.sql` — "View as Free".

## Comparing the plans ("View as Free")

Settings → My plan → **View as Free** shows the website exactly as a Free teacher
sees it (one subject, 2 variants, the PDF footer, picture space), enforced by the
database like a real Free plan. **Back to Premium** (also on My tests while the
preview is on) restores the plan and the teaching subjects held before. It can
only lower an account's plan, never raise it, so it is safe for every account;
`PLAN_PREVIEW` in `src/lib/plans/plans.ts` hides it.

Apply both files before using the updated account UI. If the assignment table
is unavailable, the app keeps account tests read-only and offers retry rather
than granting access. Guest editing remains available.

Existing users must explicitly choose their subject; `default_subject` is only
a suggestion. Free users cannot switch to a new subject themselves after saving.
When multi-subject access expires, they choose one of their previous subjects;
other tests remain readable and printable, with temporary local print options.
Plan checks on the database apply immediately; the browser refreshes access
periodically and when returning to the tab.

## Paper view while editing

**ქაღალდზე ნახვა** in the editor's top bar splits the screen: the editor on the
left, the whole test as printed A4 pages on the right (student paper or answer
key), drawn by the same code as the print page and the PDF. It follows every
change, and the question being edited is outlined and scrolled into view on the
paper. On small screens the pages cover the editor until closed.

## Guest work and account migration

Guest tests are stored in localStorage and pictures in IndexedDB. Eligible tests
move to the account after subject selection; originals are removed only after
confirmed image uploads and test saves. Guest tests outside the active subjects
remain in this browser under **Tests remaining on this device**, with read-only
viewing and printing. They can migrate when the account gains subject access.
They are not cloud backups: clearing browser site data deletes these local copies.
Pictures shared with retained guest tests are preserved.

## Verification

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
npm run test:e2e -- --workers=3
```

Unit tests include actual Postgres permission checks using PGlite, a development-only
dependency. They run the project's SQL against a local in-memory database
with stand-ins for Supabase infrastructure; they never contact the real project.
Browser tests use installed Google Chrome. `e2e/teaching-subjects.spec.ts` mocks
account responses to test onboarding, Premium access, downgrade, and retained
work. Real email delivery and Google OAuth still require a configured test account
and a staging Supabase project.

The PDF server needs installed Chrome/Chromium or `CHROME_PATH`. Verify this on
your chosen hosting platform; it falls back to browser printing when unavailable.

If type checking reports a generated duplicate such as `.next/dev/types/routes.d 2.ts`,
stop development/build processes and move only that duplicate generated file out
of `.next`. Do not disable type checking. Cloud-synced Desktop folders can create
these duplicate files.

## Manual Phase 1 checks

1. Sign in with a new or existing account without assignments. Confirm all eight
   subject choices appear. Save, reload, and verify onboarding is not repeated.
2. With a Free test account, choose one subject. Try creating, duplicating,
   using templates, or changing a test into another subject; expect the upgrade
   prompt and no unauthorized saved test.
3. With Premium, School, or an active trial, use Settings to choose several
   subjects and a default within those choices. Create a test in each.
4. In an isolated test project, expire multi-subject access. Choose one previous
   subject and verify other tests remain readable and printable but not editable.
5. Create guest tests in two subjects, then sign into a one-subject account.
   Verify the eligible test migrates, the other remains readable on the device,
   and both retain their pictures.

See `CLAUDE.md` for architecture and implementation conventions. Phase 2
(Georgian defaults in every tool) and Phase 3 (live question print previews)
remain planned; this change implements Phase 1 only.
