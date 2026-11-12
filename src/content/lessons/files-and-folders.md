Every file on your computer has an exact address called a **[path](term:path)**. Understanding paths is the cure for one of the most common beginner errors: `FileNotFoundError`.

## The file system is a tree

Folders (also called **[directories](term:directory)**) contain files and other folders, which contain more folders. Drawn out, it looks like an upside-down tree:

```
/                         ← the "root": the very top
└── Users
    └── sabaghlonti       ← your home folder, also written ~
        ├── Desktop
        │   └── Phyton
        │       ├── package.json
        │       └── src
        └── Documents
```

## Paths: the address of a file

An **absolute path** starts at the root `/` and gives the full address. It works from anywhere:

```
/Users/sabaghlonti/Desktop/Phyton/package.json
```

A **relative path** starts from *where you are now* (your **[working directory](term:working-directory)**):

```
src/main.tsx        ← "the src folder inside the folder I'm in"
../notes.txt        ← "notes.txt in the folder ABOVE me"
./hello.py          ← "hello.py right here" (the ./ is optional)
```

Two special names:
- `.` means "this folder".
- `..` means "the folder above this one" (the **parent**).

## Why FileNotFoundError happens

```python
with open("data.txt") as f:   # a relative path!
    print(f.read())
```

`"data.txt"` is relative, so Python looks for it in the **working directory**: the folder your terminal was in when you ran `python3`. That may not be the folder your script is in! If you run `python3 projects/read.py` from your home folder, Python looks for `~/data.txt`, not `~/projects/data.txt`.

**Fix:** `cd` into the right folder first, or build the path from the script's own location. You'll learn how in [Working with files](/roadmap/files-io).

## File extensions

The ending of a file name, like `.py`, `.txt`, `.json` or `.md`, is its **extension**. It tells programs (and you) what kind of file it is. Changing `.txt` to `.py` doesn't convert anything; it just changes which program opens it.

## Hidden files

Files whose names start with a dot, like `.gitignore`, are **hidden** by default. Developers call them "dotfiles"; they're usually settings. See them with:

```bash
ls -a    # "a" for all
```

In Finder, press **⌘ + Shift + .** to show or hide them.

## Naming tips

- Avoid **spaces** in project file names. `my project.py` must be typed as `"my project.py"` in the terminal. Use `my_project.py` instead.
- Use lowercase, and be consistent.

## Try it

In the terminal, go to your `Phyton` folder and run `ls -a`. Find the hidden `.git` folder: that's where Git keeps DevPath's whole history!

## Key takeaways

- Files live in a **tree** of folders, starting at the root `/`.
- **Absolute** paths start at `/`; **relative** paths start from your **working directory**.
- `.` is "here" and `..` is "one folder up".
- `FileNotFoundError` usually means Python looked in a different folder than you expected.
