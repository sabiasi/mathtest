A **[bug](term:bug)** is when code does something different from what you expected. **[Debugging](term:debugging)** is finding out why. Every developer, at every level, spends a big part of their day doing it. It isn't a sign you're bad at coding. It *is* coding.

## The mindset: be a detective, not a guesser

The beginner way: change something random, run it, repeat, and get frustrated.

The professional way is the **scientific method**:

1. **Reproduce** it. Can you make the bug happen every time? What exact steps?
2. **Read** the error message, bottom line first (see [Errors and exceptions](/roadmap/error-handling)).
3. **Make a guess** (a hypothesis): "I think `total` is a string, not a number."
4. **Test the guess**: print the value, or pause the program and look.
5. **Fix** it, then check that the bug is gone *and nothing else broke*.

## A buggy example

```python
def average(numbers):
    total = 0
    for n in numbers:
        total = n            # bug!
    return total / len(numbers)

print(average([2, 4, 6]))    # expected 4.0, got 2.0
```

No error message here. The program runs, it's just wrong. These bugs are the trickiest.

## Tool 1: print debugging

Print the values you *think* you know:

```python
    for n in numbers:
        total = n
        print(f"n={n}, total={total}")   # DEBUG
```

```
n=2, total=2
n=4, total=4
n=6, total=6
```

`total` never grows! It should be `total += n`. Printing turned a mystery into a fact. Remove debug prints when you're done.

## Tool 2: the debugger and breakpoints

A **debugger** pauses your program at a line you choose, a **[breakpoint](term:breakpoint)**, so you can look at every variable and run the code one line at a time.

**In VS Code:**
1. Click left of a line number. A red dot appears: that's your breakpoint.
2. Press **F5** and choose "Python File".
3. The program stops at the dot. The **Variables** panel shows every value.
4. Press **F10** to run the next line (step over), or **F11** to step into a function call.

**In plain Python:** add `breakpoint()` on any line. When Python reaches it, you get a `(Pdb)` prompt: type a variable name to see its value, `n` for the next line, `c` to continue, and `q` to quit.

## Tool 3: rubber duck debugging

Explain your code, line by line, out loud, to anyone. A rubber duck works fine. Very often you'll hear yourself say "…and then this adds n to the total… wait, no it doesn't." Explaining forces you to check what the code *actually* says rather than what you *meant*.

## Tool 4: make it smaller

If a big program breaks, shrink the problem:
- **Comment out half** the code. Is the bug still there? Then it's in the other half. Repeat. (That's binary search, applied to bugs! See [Searching](/roadmap/searching).)
- Copy the failing part into a tiny new file with hard-coded input. This **minimal reproduction** is also exactly what you should share when asking for help.

## Check your assumptions

Most bugs hide in something you were *sure* about:
- "This variable is a number." Is it? Check with `print(type(x))`.
- "This function gets called." Does it? Put a print at the top.
- "I'm editing the file that's running." Are you? (This happens to everyone.)
- "I saved the file." Did you?

## When you're stuck

- Take a 10-minute break. Seriously: solutions often appear in the shower.
- Search the **exact error message** in quotes.
- When asking for help, include: what you expected, what happened instead, the full error, a minimal reproduction, and what you already tried.

## Try it

Copy the `average` example into a file. Instead of reading the fix above, set a breakpoint inside the loop, press F5, and watch `total` change in the Variables panel.

## Key takeaways

- Debug like a scientist: **reproduce → read → guess → test → fix**.
- **Print debugging** and **breakpoints** turn guesses into facts.
- **Shrink** the problem until the bug has nowhere to hide.
- Most bugs live in assumptions. Check what you're "sure" about first.
