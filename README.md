# MathTest

Create math tests, quizzes and exams quickly, with a Georgian interface and
easy math input, then print them or save them as PDF.

> Status: Phase 0. The basic layout and "My tests" page are done; the editor comes next.
> See [CLAUDE.md](CLAUDE.md) for the full vision, plan and tech decisions.

## Run it on your computer

You need [Node.js](https://nodejs.org) (LTS) installed.

```bash
npm install     # first time only: downloads the libraries the app uses
npm run dev     # starts the app
```

Then open <http://localhost:3000> in your browser. Stop the server with
`Ctrl + C` in the terminal.

## Other commands

| Command | What it does |
| --- | --- |
| `npm test` | Runs the automatic tests |
| `npm run lint` | Checks the code for common mistakes |
| `npm run build` | Builds the optimized version (also checks types) |

## Where things live

- `src/app/`: the pages (routes)
- `src/features/`: what each page shows
- `src/i18n/dictionaries.ts`: all text, in Georgian and English
- `src/lib/storage/`: saving and loading tests (browser localStorage for now)

Tests are stored only in your browser. Clearing the browser's site data deletes them.
