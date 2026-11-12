In [The terminal](/roadmap/terminal) you learned to look around and move between folders. Now let's do real work: copying, searching, combining commands, and understanding the **PATH**, which explains the `command not found` errors that confuse so many beginners.

## Working with files

| Command | What it does |
|---|---|
| `cp notes.txt backup.txt` | **Copy** a file |
| `cp -r src src-backup` | Copy a whole folder (`-r` = recursive: everything inside too) |
| `mv old.txt new.txt` | **Move** or **rename** a file |
| `mv notes.txt ~/Documents/` | Move it into another folder |
| `rm file.txt` | **Delete** a file, permanently, with no trash can |
| `rm -r folder` | Delete a folder and everything in it (be very careful!) |
| `cat file.txt` | Print a file's contents |
| `less big.log` | Scroll through a long file (press `q` to quit) |
| `head -5 file.txt` | Show the first 5 lines |

Many commands take **flags**: options starting with `-`, like `ls -l` (long details) or `ls -la` (long + hidden files).

## Getting help

```bash
man ls          # the full manual for ls (press q to quit)
ls --help       # a shorter summary (works for many commands)
```

## Searching

```bash
grep "TODO" notes.txt          # lines in notes.txt containing TODO
grep -rn "def " src/           # search a whole folder, showing line numbers
find . -name "*.py"            # every .py file under this folder
```

`*` is a **wildcard** that means "anything". So `*.py` means "anything ending in .py".

## Pipes and redirection: combining commands

This is where the command line becomes powerful. The **pipe** `|` sends one command's output into the next command:

```bash
ls | wc -l                     # how many files are here? (wc -l counts lines)
history | grep python          # which python commands did I run recently?
```

**Redirection** sends output into a file:

```bash
echo "hello" > note.txt        # write to note.txt (replaces it!)
echo "again" >> note.txt       # append to note.txt
python3 report.py > out.txt    # save a program's output
```

Small tools, each doing one thing, snapped together like LEGO: that's the core idea of the Unix command line.

## Environment variables and the PATH

Your shell has settings called **[environment variables](term:environment-variable)**. See one with `echo`:

```bash
echo $HOME      # /Users/you
echo $PATH      # /usr/local/bin:/usr/bin:/bin:...
```

**[PATH](term:path-variable)** is a list of folders, separated by `:`. When you type a command like `python3` or `node`, the shell looks through those folders **in order** for a program with that name.

That's why, earlier, `node` gave `command not found`: it wasn't installed in any PATH folder. And it's why a terminal opened *before* installing didn't see it: the terminal reads its settings when it starts. To see which file a command really runs:

```bash
which python3     # /usr/bin/python3
which node        # /usr/local/bin/node
```

## Handy tricks

- **Ctrl + R**: search your command history. Type part of an old command.
- **Ctrl + A / Ctrl + E**: jump to the start / end of the line.
- `cd -`: go back to the previous folder.
- `open .`: open the current folder in Finder (Mac only).
- `code .`: open the current folder in VS Code (once VS Code's `code` command is installed).

## Try it

1. In your `Phyton` folder, run `find src -name "*.md" | wc -l`. How many lesson files does DevPath have?
2. Run `grep -rn "term:" src/content/lessons | head -5` to see how lessons link to the glossary.

## Key takeaways

- `cp`, `mv` and `rm` copy, move/rename and delete. `rm` is permanent.
- `grep` searches inside files; `find` searches for files.
- `|` pipes output into another command; `>` and `>>` write it to a file.
- **PATH** is the list of folders the shell searches for commands. `which` shows which one wins.
