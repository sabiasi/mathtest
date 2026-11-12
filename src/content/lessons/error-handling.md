Errors feel scary at first, but they're one of the most helpful things a computer gives you. An error message tells you **what** went wrong and **where**. This lesson teaches you to read errors and to handle them in your code.

## Reading a traceback

When something goes wrong, Python prints a **[traceback](term:traceback)**:

```
Traceback (most recent call last):
  File "/Users/you/shop.py", line 9, in <module>
    total = add_tax(price)
  File "/Users/you/shop.py", line 4, in add_tax
    return price * 1.2
TypeError: can't multiply sequence by non-int of type 'float'
```

**Read it from the bottom up:**

1. **Last line**, the error type and message: `TypeError: can't multiply sequence…`. This is *what* happened.
2. **Just above it**, where it happened: line 4, inside `add_tax`.
3. **Further up**, how the program got there: line 9 called `add_tax`.

Here `price` was a string (probably from `input()`), and you can't multiply text by 1.2. The fix: `price = float(price)` first.

## The errors you'll meet most

| Error | Usually means |
|---|---|
| `SyntaxError` | Python couldn't read the code: a missing `:`, quote or bracket |
| `IndentationError` | Spaces at the start of a line don't line up |
| `NameError` | A variable or function name doesn't exist, often a typo |
| `TypeError` | Wrong type for the operation, e.g. `"5" + 5` |
| `ValueError` | Right type, bad value, e.g. `int("hello")` |
| `IndexError` | A list position that doesn't exist |
| `KeyError` | A dict key that doesn't exist |
| `AttributeError` | That object has no such method or attribute, e.g. `5.upper()` |
| `FileNotFoundError` | No file at that path (see [Files and folders](/roadmap/files-and-folders)) |

## Handling errors with try / except

Some errors aren't bugs. They're things that can go wrong in real life, like a user typing a word instead of a number. These are called **[exceptions](term:exception)**, and you can catch them:

```python
while True:
    answer = input("How old are you? ")
    try:
        age = int(answer)          # might fail
    except ValueError:
        print("Please type a number, like 25.")
    else:
        break                      # only runs if there was NO error

print(f"Next year you'll be {age + 1}.")
```

- `try:` holds the code that might fail.
- `except ValueError:` runs if *that kind* of error happens.
- `else:` runs if nothing went wrong (optional).
- `finally:` runs no matter what. It's useful for cleanup (optional).

## Catch specific errors, never everything

```python
# ❌ Bad: hides EVERY problem, including real bugs and typos
try:
    age = int(answr)       # typo! NameError…
except:
    print("Invalid number")  # …but we print the wrong message and never find out

# ✅ Good: only catches what you expect
try:
    age = int(answer)
except ValueError:
    print("Invalid number")
```

A bare `except:` swallows errors you needed to see. Silenced errors become mysterious bugs later.

## Raising your own errors

When your function gets input it can't handle, *raise* an error with a helpful message rather than returning something wrong:

```python
def withdraw(balance, amount):
    if amount <= 0:
        raise ValueError(f"Amount must be positive, got {amount}")
    return balance - amount
```

Failing loudly and early is much easier to debug than failing quietly later.

## Try it

Write a program that asks for two numbers and prints the first divided by the second. Make it survive both a word typed instead of a number (`ValueError`) and dividing by zero (`ZeroDivisionError`), with a different friendly message for each.

## Key takeaways

- Read tracebacks **bottom up**: what happened, then where, then how you got there.
- The error type (`TypeError`, `KeyError`…) is a strong clue to the cause.
- Use `try` / `except SpecificError` for problems you **expect**, like bad user input.
- Never use a bare `except:`. **Raise** clear errors instead of failing silently.
