**[Git](term:git)** is a **[version control](term:version-control)** system: it saves snapshots of your project over time. Think of it as an unlimited undo button, a diary of every change, and a way for many people to work on the same code without overwriting each other.

## Why not just copy folders?

You may have done this: `essay.doc`, `essay-final.doc`, `essay-final-v2-REALLY-final.doc`. Git solves that properly: one folder, a complete history, and a short message explaining every change.

## The key ideas

- **[Repository](term:repository)** (repo): a project folder that Git is tracking. The history lives in a hidden `.git` folder inside it.
- **[Commit](term:commit)**: a saved snapshot of your files, plus a message, an author and a date.
- **Staging area**: where you collect the changes you want in your *next* commit.

Changes move through three places:

```
 working folder   ──git add──▶   staging area   ──git commit──▶   history
 (files you edit)                (next snapshot)                  (saved forever)
```

## The everyday commands

```bash
git init                     # start tracking this folder (once per project)
git status                   # what changed? what's staged? ← run this constantly
git add hello.py             # stage one file
git add .                    # stage everything that changed
git commit -m "Add greeting function"   # save the snapshot with a message
git log --oneline            # see the history, one line per commit
git diff                     # see exactly what changed (not yet staged)
```

## Look at DevPath's own history

DevPath has used Git since its very first file. In your `Phyton` folder, run:

```bash
git log --oneline
```

You'll see commits like `Add app shell: sidebar, routes, Home and placeholder pages`. Each is one small, described step. Try `git show HEAD` to see exactly what the latest commit changed.

## Writing good commit messages

- Start with a verb in the present tense: **"Add …"**, **"Fix …"**, **"Remove …"**.
- Say *what* changed and, if it isn't obvious, *why*.
- Keep commits **small**: one idea each. That makes problems easy to find and undo.

❌ `stuff`, `fixed it`, `asdf`
✅ `Fix crash when the journal is empty`

## Branches: parallel versions

A **[branch](term:branch)** is a separate line of work. You can try an idea without touching the working version:

```bash
git switch -c dark-mode      # create a new branch and move to it
# ...edit and commit as usual...
git switch main              # go back to the main branch
git merge dark-mode          # bring the dark-mode work into main
```

`main` is usually the stable, working version. Professionals create a branch for every feature or fix. Phase 2 of DevPath includes a visual Git timeline where you can click through commits, branches and merges.

## .gitignore: what NOT to track

A file called `.gitignore` lists things Git should skip: downloaded libraries (`node_modules/`, `.venv/`), build output, and **secrets** like `.env` files with passwords or API keys. Open DevPath's `.gitignore` to see a real one.

## Oops, undo!

```bash
git restore hello.py           # throw away unsaved changes to a file
git restore --staged hello.py  # unstage (keep the changes)
git commit --amend             # fix the message of the LAST commit (before sharing it)
```

## Try it

1. Make a new folder, `git init` it, create a file, and make three commits with good messages.
2. Play the first few levels of **Learn Git Branching** (in the resources below). It makes branches click.

## Key takeaways

- A **repository** tracks a folder; a **commit** is a snapshot with a message.
- The rhythm: edit → `git status` → `git add` → `git commit -m "…"`.
- **Branches** let you work on something without breaking `main`, then **merge** it in.
- Keep commits small and described, and keep secrets out with `.gitignore`.
