Code is read far more often than it's written: by teammates, by reviewers, and by you in six months, when you've forgotten everything. **Clean code** is code that's easy to read, understand and change.

## Names that explain

```python
# ❌
def calc(l):
    t = 0
    for x in l:
        t += x[1] * x[2]
    return t

# ✅
def order_total(items):
    total = 0
    for item in items:
        total += item.price * item.quantity
    return total
```

Same logic, but the second version needs no explanation. Good names are the cheapest, biggest improvement you can make.

## Small functions that do one thing

If you need the word "and" to describe a function ("it loads the file *and* cleans the data *and* draws a chart"), split it into three. Small [functions](/roadmap/functions) are easier to name, test and reuse.

## Don't repeat yourself (DRY)

Copy-pasted code means copy-pasted bugs: fix one copy, forget the other. When you write the same thing a third time, turn it into a function.

## Comments explain *why*, not *what*

```python
# ❌ Says what the code already says
i += 1  # add one to i

# ✅ Explains a reason the code can't show
# The API counts pages from 1, not 0.
page = index + 1
```

## Follow the style guide

Python has an official style guide, **PEP 8**: 4-space indents, `snake_case` names, `CapWords` for classes, spaces around `=`. A formatter like **Ruff** or **Black** applies it automatically.

## The Zen of Python

Type `import this` in Python. A few favorites:
> Readability counts.
> Simple is better than complex.
> Errors should never pass silently.

## Key takeaways

- Clear **names** are the biggest win.
- Small functions that do **one thing**; don't repeat yourself.
- Comments explain **why**; use a **formatter** for style.
