So far our programs do the same thing every time. **[Conditionals](term:conditional)** let a program make decisions: *if* something is true, do this, *otherwise* do that.

## if, elif, else

```python
temperature = 28

if temperature > 25:
    print("It's hot. Drink water!")
elif temperature > 15:
    print("Nice weather.")
else:
    print("Bring a jacket.")
```

Python checks each condition **from top to bottom** and runs the **first** block whose condition is true, then skips the rest.
- `if` comes first and is required.
- `elif` ("else if") is optional; you can have as many as you like.
- `else` is optional and runs when nothing above was true.

## Indentation is part of the code

The lines *inside* an `if` are pushed in by 4 spaces. That's called **[indentation](term:indentation)**. Many languages use `{ }` braces for this, but in Python the indentation itself decides what's inside the block.

```python
if temperature > 25:
    print("Hot!")        # inside the if
    print("Really hot!") # also inside
print("Done")            # outside: always runs
```

Forgetting the colon `:` or mixing up indentation gives `SyntaxError` or `IndentationError`.

## Comparisons

Each comparison gives back a [boolean](term:boolean) (`True` or `False`):

| Operator | Meaning | Example (`x = 5`) |
|---|---|---|
| `==` | equal to | `x == 5` → True |
| `!=` | not equal to | `x != 5` → False |
| `>` `<` | greater / less than | `x > 3` → True |
| `>=` `<=` | greater/less than or equal | `x <= 4` → False |

⚠️ `=` assigns, `==` compares. `if x = 5:` is a SyntaxError.

## Combining conditions: and, or, not

```python
age = 20
has_ticket = True

if age >= 18 and has_ticket:
    print("Welcome in!")

if age < 13 or age > 65:
    print("Discount!")

if not has_ticket:
    print("Please buy a ticket.")
```

- `and`: both sides must be true.
- `or`: at least one side must be true.
- `not`: flips True ↔ False.

## Truthy and falsy

Python treats some values as "false-like" in an `if`: `0`, `""` (empty string), `[]` (empty list), and `None`. Everything else counts as true. So this is a common way to check for empty input:

```python
name = input("Name: ")
if not name:
    print("You didn't type anything!")
```

## Try it

Write a grade calculator: ask for a score from 0 to 100 and print A (90+), B (80+), C (70+) or "Keep practicing". Does the **order** of your `elif`s matter? Try putting the C check first and see.

## Key takeaways

- `if` / `elif` / `else` run the **first** block whose condition is true.
- The **indentation** after a `:` defines what's inside the block.
- Comparisons (`==`, `>`, …) give **booleans**; combine them with `and`, `or` and `not`.
- Empty values (`0`, `""`, `[]`, `None`) count as false.
