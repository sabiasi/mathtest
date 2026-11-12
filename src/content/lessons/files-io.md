When a program ends, its variables disappear. To remember anything (results, settings, a to-do list), you write it to a **file**. Reading and writing files is often called **[file I/O](term:io)** (input/output).

## Writing a file

```python
with open("notes.txt", "w", encoding="utf-8") as file:
    file.write("First line\n")
    file.write("Second line\n")
```

- `open(path, mode)` opens the file and gives you a file object.
- `"w"` means **write**. It creates the file, or **erases it** if it already exists!
- `"\n"` is the "new line" character; `write()` doesn't add one for you.
- `encoding="utf-8"` says how to turn text into bytes (see [Binary](/roadmap/binary)). Always include it, so emoji and accents work everywhere.

## Why `with`?

Files must be **closed** when you're done, or data might not be saved. `with` closes the file automatically when the indented block ends, even if an error happens inside. Always use `with`.

## Reading a file

```python
with open("notes.txt", encoding="utf-8") as file:   # "r" (read) is the default
    content = file.read()          # the whole file as one string

with open("notes.txt", encoding="utf-8") as file:
    for line in file:              # one line at a time (great for big files)
        print(line.strip())        # .strip() removes the trailing \n
```

## The modes

| Mode | Meaning | If the file exists… | If it doesn't… |
|---|---|---|---|
| `"r"` | read (default) | reads it | `FileNotFoundError` |
| `"w"` | write | **erases it** first | creates it |
| `"a"` | append | adds to the end | creates it |

`"a"` is perfect for logs and journals: each run adds to the file without wiping it.

## Paths that work wherever you run from

Remember from [Files and folders](/roadmap/files-and-folders) that a relative path like `"notes.txt"` depends on your working directory. The `pathlib` module builds a path from **the script's own location**, so it always works:

```python
from pathlib import Path

HERE = Path(__file__).parent          # the folder this .py file is in
notes = HERE / "notes.txt"            # "/" joins path parts, on any OS

notes.write_text("Hello!\n", encoding="utf-8")   # pathlib shortcut
print(notes.read_text(encoding="utf-8"))
print(notes.exists())                             # True
```

## Handling a missing file

Combine this with [error handling](/roadmap/error-handling):

```python
try:
    with open("settings.txt", encoding="utf-8") as file:
        settings = file.read()
except FileNotFoundError:
    settings = ""     # first run: no settings yet, which is fine
```

## Structured data

Plain text is fine for notes, but for structured data (lists and dicts) use a format like **CSV** (spreadsheet-style rows, via the `csv` module) or **[JSON](/roadmap/json)** (via the `json` module):

```python
import json
data = {"name": "Ada", "scores": [90, 85]}

with open("data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)       # dict → JSON file

with open("data.json", encoding="utf-8") as f:
    loaded = json.load(f)              # JSON file → dict
print(loaded["scores"])                # [90, 85]
```

## Try it

Build a tiny journal: each time the program runs, ask "What did you learn today?" and **append** the answer with today's date to `journal.txt`. Then print the whole journal.

## Key takeaways

- Use `with open(path, mode, encoding="utf-8") as f:` so the file always gets closed.
- `"r"` reads, `"w"` **overwrites**, and `"a"` appends.
- Use `pathlib` and `Path(__file__).parent` for paths that work from anywhere.
- For lists and dicts, save as **JSON** with the `json` module.
