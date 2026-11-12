A computer is a machine that follows instructions, very fast and very exactly. It has no ideas of its own: everything it does, it does because a program told it to. Let's open the box and meet the parts.

## The four main parts

Think of a computer as a kitchen:

| Part | Kitchen version | What it does |
|---|---|---|
| [CPU](term:cpu) | The chef | Follows instructions, one tiny step at a time, billions per second |
| [RAM](term:ram) (memory) | The countertop | Holds what the chef is working on *right now*. Fast, but cleared when the power goes off |
| Storage (SSD) | The pantry | Keeps everything long-term: your files, apps, photos. Slower to reach, but it remembers |
| Input / output | Doors and windows | Keyboard, mouse, screen, speakers, network: how information gets in and out |

When you open an app, the computer copies it from storage (pantry) into RAM (countertop), and the CPU (chef) starts following its instructions.

## What is a program?

A **program** is a list of instructions. A recipe, basically. The CPU only understands very simple instructions, like "add these two numbers" or "copy this number to that place". Everything impressive a computer does is built from millions of these tiny steps.

The CPU runs a loop, forever:

1. **Fetch** the next instruction from memory
2. **Decode** it (work out what it means)
3. **Execute** it (do it)

A modern CPU does this billions of times per second. That speed is the whole trick.

## Where does Python fit in?

The CPU doesn't understand Python. It only understands **machine code**: instructions written as numbers. So when you run:

```python
print("Hello!")
```

a program called the **Python [interpreter](term:interpreter)** reads your code and translates it into steps the CPU can do. When you type `python3 hello.py` in the [terminal](/roadmap/terminal), you're starting the interpreter and handing it your file.

## The operating system

The **[operating system](term:operating-system)** (macOS, Windows, Linux) is the manager program that runs everything else. It decides which program gets the CPU, keeps programs from messing with each other's memory, and handles files, the screen and the network. Your Python program asks the OS for help whenever it opens a file or prints text.

## Try it

On your Mac, open **Activity Monitor** (⌘ + Space, type "Activity Monitor").
- The **CPU** tab shows which programs are using the chef's time right now.
- The **Memory** tab shows how much of the countertop each program is using.

Open a few browser tabs and watch the memory number go up.

## Key takeaways

- The **CPU** follows instructions; **RAM** holds what's in use now; **storage** keeps things long-term.
- A **program** is a list of instructions. The CPU runs them with fetch → decode → execute.
- Python code is translated for the CPU by the **interpreter**.
- The **operating system** manages the hardware and all the other programs.
