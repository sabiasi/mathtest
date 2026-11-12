The **[terminal](term:terminal)** is a window where you type commands to your computer instead of clicking. It looks old-fashioned, but developers use it every day because it's fast, precise, and easy to automate.

## The parts of the picture

When you open Terminal on a Mac, you see something like:

```
sabaghlonti@MacBook ~ %
```

- **Terminal** is the window (the app).
- Inside it runs a **[shell](term:shell)**: the program that reads your commands and runs them. On a Mac it's called **zsh**.
- `sabaghlonti@MacBook ~ %` is the **[prompt](term:prompt)**. It means "I'm ready, type something". The `~` shows which folder you're in (`~` means your home folder).

You type a command, press **Enter**, and the shell runs it and prints the result.

## Your first commands

| Command | Stands for | What it does |
|---|---|---|
| `pwd` | print working directory | Shows which folder you're in |
| `ls` | list | Shows what's in this folder |
| `cd Desktop` | change directory | Moves into the Desktop folder |
| `cd ..` | | Moves up one folder |
| `cd ~` | | Goes back home |
| `mkdir practice` | make directory | Creates a folder called `practice` |
| `touch notes.txt` | | Creates an empty file |
| `clear` | | Clears the screen (or press ⌘ + K) |

Try a little session:

```bash
pwd                 # /Users/you
cd Desktop
mkdir practice
cd practice
touch hello.py
ls                  # hello.py
```

## Running Python from the terminal

```bash
python3 --version   # which Python do I have?
python3 hello.py    # run the file hello.py
python3             # start an interactive Python session (type exit() to leave)
```

## Shortcuts that save hours

- **Tab** auto-completes file and folder names. Type `cd Des` and press Tab.
- **↑ (up arrow)** brings back your previous commands.
- **Ctrl + C** stops whatever is running, like a stuck program or a dev server.
- Commands are **case-sensitive** and **spaces matter**: `cd Desktop` works, `cdDesktop` doesn't.

## A word of caution

The terminal does exactly what you say, with no trash can and no "are you sure?". `rm` (remove) deletes files **permanently**. Read a command before you press Enter, especially one copied from the internet.

## Try it

1. Open the terminal and use `pwd`, `ls` and `cd` to walk to your `Desktop/Phyton` folder.
2. Run `ls` there. You should see DevPath's files, like `package.json`!

## Key takeaways

- The **terminal** is the window, the **shell** (zsh) runs your commands, and the **prompt** waits for input.
- `pwd`, `ls` and `cd` are how you look around and move between folders.
- **Tab** completes names, **↑** repeats commands, and **Ctrl + C** stops a program.
- The terminal never asks "are you sure?". Read before you press Enter.
