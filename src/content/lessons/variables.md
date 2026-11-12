A **[variable](term:variable)** is a name you give to a value so you can use it later. It's how a program remembers things: a score, a username, a total.

## Creating a variable

```python
name = "Ada"
age = 36
print(name)   # Ada
print(age)    # 36
```

The `=` sign is the **[assignment](term:assignment)** operator. Read it as **"gets"** or **"now points to"**, not "equals":

> `age = 36` means "the name `age` now points to the value 36".

As you saw in [Memory](/roadmap/memory), the name is a label stuck on a value, not a box the value lives in.

## Changing a variable

Variables can be pointed at new values. That's why they're called *variables*.

```python
score = 0
score = score + 10   # take the current score, add 10, store the result
score += 5           # a shortcut for: score = score + 5
print(score)         # 15
```

`score = score + 10` would make no sense in maths, but in code it's normal: the right side is worked out first (0 + 10), then the name is moved to the result.

## Naming rules

Python requires that names:
- contain only letters, digits and underscores (`_`),
- don't start with a digit (`2nd_place` ❌, `second_place` ✅),
- aren't one of Python's reserved words, like `if`, `for` or `class`.

Names are **case-sensitive**: `Age` and `age` are two different variables.

## Naming well (this matters a lot)

Python developers write names in **snake_case**: lowercase words joined by underscores.

```python
# Hard to understand
x = 19.99
n = 3
t = x * n

# Clear
price = 19.99
quantity = 3
total_price = price * quantity
```

A good name says **what the value means**. You'll read your code far more often than you write it. Values that should never change are written in CAPITALS by convention: `MAX_LIVES = 3`.

## Common mistakes

**Using a name before giving it a value:**
```python
print(total)   # NameError: name 'total' is not defined
```
Python reads top to bottom, so the assignment has to come first. Check for typos too: `totla` isn't `total`.

**Mixing up `=` and `==`:** `=` assigns a value; `==` *asks* whether two values are equal (see [Conditionals](/roadmap/conditionals)).

## Try it

Create variables for the price of a coffee and how many you drink per week. Calculate and print what you spend in a year, with good variable names.

## Key takeaways

- A variable is a **name that points to a value**; `=` means "now points to".
- The right side of `=` is worked out first, so `x = x + 1` is fine.
- Use clear **snake_case** names that describe what the value means.
- `NameError` means you used a name that doesn't exist yet. Often it's a typo.
