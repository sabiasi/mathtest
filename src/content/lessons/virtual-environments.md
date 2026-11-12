Imagine project A needs version 1 of a library and project B needs version 2. If both share one Python installation, one of them breaks. A **[virtual environment](term:virtual-environment)** gives each project its **own private set of packages**.

## What a virtual environment is

It's just a folder (usually called `.venv`) inside your project, holding:
- a link to a Python interpreter, and
- every package you install for this project.

When the environment is **activated**, `python` and `pip` use that folder instead of the system-wide one.

## The workflow

In your project folder:

```bash
python3 -m venv .venv            # 1. create it (once per project)
source .venv/bin/activate        # 2. activate it (each new terminal)
```

Your prompt changes to show it's active:

```
(.venv) you@MacBook my-project %
```

Now install packages. They go into `.venv`, not your whole computer:

```bash
pip install requests             # 3. install what you need
pip list                         # see what's installed here
deactivate                       # 4. leave the environment when done
```

- `python3 -m venv` means "run the `venv` module as a program".
- On Windows, step 2 is `.venv\Scripts\activate` instead.

## requirements.txt: a shopping list

Record exactly what the project needs, so anyone (including future you) can recreate it:

```bash
pip freeze > requirements.txt    # write every installed package + version to a file
```

The file looks like:

```
certifi==2026.10.5
requests==2.33.0
...
```

On another computer, or after deleting `.venv`:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt  # install everything on the list
```

## Never commit .venv

`.venv` can hold thousands of files and is specific to your computer. Add it to `.gitignore`:

```
.venv/
```

Commit `requirements.txt` instead. It's tiny and is all anyone needs to rebuild the environment.

## You've seen this before!

DevPath does the same thing for JavaScript:

| Python | JavaScript (DevPath) |
|---|---|
| `.venv/` | `node_modules/` |
| `requirements.txt` | `package.json` (+ `package-lock.json`) |
| `pip install -r requirements.txt` | `npm install` |

Both folders are in `.gitignore`, and both are rebuilt from a small list file. Same idea, different language.

## A note about your Python version

Your Mac came with Python 3.9 (`python3 --version`). It works, but it's old. When you start bigger projects, install the latest version from **python.org**. Each virtual environment uses whichever `python3` created it.

## Try it

Make a folder `weather-app`, create and activate a virtual environment, `pip install requests`, then write `requirements.txt`. Run `deactivate`, then try `python3 -c "import requests"`. Did it fail? That means the package really is inside the environment only.

## Key takeaways

- A **virtual environment** (`.venv`) gives each project its own packages.
- Create it with `python3 -m venv .venv`, activate it with `source .venv/bin/activate`.
- `pip freeze > requirements.txt` records dependencies; `pip install -r requirements.txt` restores them.
- Put `.venv/` in `.gitignore` and commit `requirements.txt`.
