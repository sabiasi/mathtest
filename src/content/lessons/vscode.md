**VS Code** (Visual Studio Code) is a free code editor, and the most popular one among developers. You'll spend thousands of hours in your editor, so learning it well pays off quickly.

## Editor vs. IDE

A **code editor** is a text editor built for code: colors (syntax highlighting), auto-complete and search. An **[IDE](term:ide)** (Integrated Development Environment) adds tools like a debugger, a terminal and testing. VS Code starts as an editor and becomes IDE-like through **extensions**.

## The layout

- **Explorer** (⌘ + Shift + E): your project's files and folders.
- **Editor**: where you write. You can split it to see two files side by side (⌘ + \\).
- **Integrated terminal** (Ctrl + \`): a real terminal, already in your project folder.
- **Status bar** (the bottom strip): shows the language, the Python version and the Git branch.

Always open a whole **folder** (File → Open Folder), not single files. Then VS Code understands your project.

## The one shortcut to remember

**⌘ + Shift + P** opens the **Command Palette**: a search box for *every* VS Code feature. Forgot a shortcut? Type what you want: "format", "rename", "toggle theme"…

## Shortcuts worth learning

| Shortcut | What it does |
|---|---|
| ⌘ + P | Quickly open any file by typing part of its name |
| ⌘ + Shift + F | Search across all files |
| F12 | **Go to definition**: jump to where a function is defined |
| F2 | **Rename** a variable everywhere it's used, safely |
| ⌘ + / | Comment / uncomment the selected lines |
| ⌥ + ↑ / ↓ | Move the current line up or down |
| ⌘ + D | Select the next match (multi-cursor editing) |
| ⌘ + Z / ⌘ + Shift + Z | Undo / redo |

## Setting up for Python

1. Install the **Python** extension by Microsoft (Extensions view: ⌘ + Shift + X). It includes **Pylance**, which gives smart auto-complete and spots errors as you type.
2. Pick your interpreter: Command Palette → **"Python: Select Interpreter"**. Choose your project's [virtual environment](/roadmap/virtual-environments) if it has one.
3. Run a file with the ▷ button at the top right, or in the terminal with `python3 file.py`.

## Squiggly lines are your friends

Red underlines mean "this is an error"; yellow means "this might be a problem". Hover over one to read the message. It's like getting the error *before* running the code.

## Format on save

A **formatter** automatically tidies your code's spacing and layout. Install the **Ruff** or **Black Formatter** extension, then turn on Settings → **Format On Save**. You never think about spacing again, and your code always looks professional.

## Try it

1. Open your `Phyton` folder in VS Code. Press ⌘ + P and type `navigation` to jump straight to DevPath's menu file.
2. In any `.ts` file, click on a function name and press F12. Where did you land?

## Key takeaways

- Open **folders**, not single files.
- **⌘ + Shift + P** (Command Palette) finds every feature.
- **F12** jumps to definitions; **F2** renames safely everywhere.
- Install the Python extension, select your interpreter, and turn on **format on save**.
