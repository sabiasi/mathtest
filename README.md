# DevPath

**Your personal roadmap, learning lab and progress tracker, from absolute beginner to job-ready developer.**

DevPath runs in your web browser. You follow a map of everything a software engineer needs to know, read short lessons, run code, log your study sessions, and see your progress. The app itself is also a learning project: its code is written to be read, with comments that explain *why* things are done.

---

## Status

DevPath is built in phases. Each phase is finished, tested and explained before the next one starts.

- [x] **Phase 0: Setup**: project, app layout, dark/light mode, data layer, tests
- [x] **Phase 1: Roadmap**: interactive map, 46 topic pages with lessons and quizzes, glossary, backups
- [ ] **Phase 2: See how things work**: animated visualizers + a Python/JavaScript code lab
- [ ] **Phase 3: Analyze my growth**: journal, analytics dashboard, code reflection
- [ ] **Phase 4: Get job-ready**: project ideas, interview prep, portfolio builder, "How DevPath is built"

---

## What you need

| Tool | Check it's installed | What it is |
|---|---|---|
| **Node.js** (v24 or newer) | `node -v` | Runs JavaScript on your computer. All of our build tools are JavaScript programs. Download it from [nodejs.org](https://nodejs.org) (choose **LTS**). |
| **npm** | `npm -v` | Downloads the libraries the project uses. It comes with Node. |
| **git** | `git --version` | Saves the history of your code. It's already on macOS. |

## Running DevPath

Open a terminal **in the project folder** and run:

```bash
npm install
```
Downloads every library listed in `package.json` into a folder called `node_modules/`. You only need to run it the first time, and again whenever `package.json` changes.

```bash
npm run dev
```
Starts the **development server**: a small web server on your own computer. Open the address it prints (usually **http://localhost:5173**) in your browser. `localhost` means "this computer". When you save a file, the page updates by itself. Press **Ctrl + C** in the terminal to stop the server.

### All the commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the app for development, with instant reload |
| `npm test` | Run all the tests once and show what passed or failed |
| `npm run test:watch` | Re-run the tests every time you save a file |
| `npm run lint` | Check the code for likely mistakes and messy patterns ([oxlint](https://oxc.rs)) |
| `npm run check:links` | Visit every resource link in the roadmap and report broken ones (needs internet) |
| `npm run build` | Type-check the code, then create the final optimized files in `dist/` |
| `npm run preview` | Serve the `dist/` build locally, to check it before putting it online |

All of these are defined in the `"scripts"` section of `package.json`. `npm run <name>` just runs the command listed there.

---

## How the project is organized

```
├── index.html              The single HTML page. React draws the whole app inside it.
├── package.json            The project's ID card: name, libraries, scripts.
├── vite.config.ts          Settings for Vite, our dev server and build tool.
├── public/                 Files served as they are (the favicon).
├── scripts/
│   └── check-links.mjs     The link checker (npm run check:links).
└── src/
    ├── main.tsx            Entry point: starts React.
    ├── App.tsx             The router: which page shows for which URL.
    ├── index.css           Tailwind setup, brand colors, dark mode, map styles.
    ├── content/            ★ ALL LEARNING CONTENT: edit freely (see below).
    ├── layout/
    │   ├── navigation.ts   ★ The list of every page (menu + router are built from it).
    │   ├── AppLayout.tsx   The frame around every page.
    │   └── Sidebar.tsx     The menu.
    ├── components/         Small reusable pieces: Term (glossary tooltip), ProgressBar…
    ├── hooks/              Shared logic: your progress (ProgressProvider), the theme.
    ├── features/
    │   ├── home/           Home page, progress summary, data backup.
    │   ├── roadmap/        The map (React Flow), list view, status picker, layout.ts.
    │   ├── topic/          Topic pages: lesson, quiz, resources.
    │   └── glossary/       The glossary page.
    └── data/
        ├── content.ts      Loads roadmap.json and glossary.json.
        ├── lessons.ts      Loads every lesson and quiz file.
        ├── content.test.ts Checks every content file for mistakes.
        └── repository.ts   How your progress is saved (see below).
```

## Editing the content

Everything you learn from lives in `src/content/` as plain text files. You don't need to touch any React code to change it.

| File | What's in it |
|---|---|
| `roadmap.json` | The 10 stages and their topics: title, summary, why it matters, hours, prerequisites, resources |
| `lessons/<topic-id>.md` | The lesson for one topic, in Markdown |
| `quizzes/<topic-id>.json` | That topic's quiz questions |
| `glossary.json` | Every technical term and its definition |

**Special links inside lessons:**
- `[CPU](term:cpu)` underlines "CPU" and shows the `cpu` glossary definition on hover.
- `[Loops](/roadmap/loops)` links to another topic.

**Adding a new topic:**
1. Add an entry to a stage in `roadmap.json` (copy an existing one). Its `id` must be lowercase words joined by dashes, like `my-topic`.
2. Create `lessons/my-topic.md` and `quizzes/my-topic.json`.
3. Run `npm test`. The content tests check that everything matches (no missing files, quiz answers that exist, glossary terms that exist…) and tell you exactly what to fix.
4. If you added resources, run `npm run check:links`.

It appears on the map automatically: `src/features/roadmap/layout.ts` calculates where every box goes.

## Where your data is saved

Version 1 has no server and no account. Your progress is saved in your browser's **localStorage**, a small storage area that every website gets in your browser.

- ✅ It stays when you close the tab or restart your computer.
- ⚠️ It is **only in this browser on this computer**. Another browser won't see it.
- ⚠️ Clearing your browser's "site data" deletes it. Use **Export backup** at the bottom of the Home page to save a file copy, and **Import backup** to restore it.

**For the curious:** pages never use localStorage directly. They go through `src/data/repository.ts`, a list of operations like "save a topic's status". `src/data/localStorageRepository.ts` is today's implementation of that list. To add a real database later, we write a second implementation and change one line in `src/data/index.ts`. Software engineers call this the **repository pattern**.

---

## Tech stack

| Tool | Why it's here |
|---|---|
| [React](https://react.dev) | Builds the user interface out of small reusable **components** |
| [TypeScript](https://www.typescriptlang.org) | JavaScript plus **types**, so mistakes are caught before the code runs |
| [Vite](https://vite.dev) | Fast dev server and build tool |
| [Tailwind CSS](https://tailwindcss.com) | Styling with small class names like `p-4 rounded-lg` |
| [React Router](https://reactrouter.com) | Gives each page its own URL |
| [Lucide](https://lucide.dev) | Icons |
| [Vitest](https://vitest.dev) | Runs our tests |
| [React Flow](https://reactflow.dev) | Draws the roadmap map: boxes, arrows, zoom and pan |
| [react-markdown](https://github.com/remarkjs/react-markdown) | Turns lesson Markdown into web pages |
| [Tailwind Typography](https://github.com/tailwindlabs/tailwindcss-typography) | Nice default styles for long text (the `prose` class) |

Later phases add Monaco (code editor), Pyodide (Python in the browser) and Recharts (charts).

---

## Troubleshooting

**`command not found: node` or `npm`**
Node isn't installed, or your terminal was open before you installed it. Close the terminal, open a new one, and try `node -v` again. In VS Code you may need to quit it fully (⌘ + Q) and reopen it.

**`Port 5173 is in use`**
Another dev server is still running, maybe in a different terminal window. Stop it with Ctrl + C there, or just use the new address Vite prints.

**The page is blank**
Open the browser's developer tools (⌥ + ⌘ + I on a Mac) and look at the **Console** tab. Red messages there explain what went wrong. Also check the terminal where `npm run dev` is running.

**`Cannot find module …` after pulling new code**
A new library was added. Run `npm install` again.
