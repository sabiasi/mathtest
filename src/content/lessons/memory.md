When your program runs, everything it's working with lives in **[RAM](term:ram)**. Picturing what memory looks like will save you from some of the most confusing bugs in programming.

## Memory is a long row of numbered boxes

Imagine a huge row of mailboxes. Each one holds one [byte](term:byte), and each has a number written on it called its **[address](term:memory-address)**. A computer with 8 GB of RAM has about 8 billion of these boxes.

When a program needs to remember something, like a number or a piece of text, it's given some boxes to store it in. When it no longer needs them, they're freed up for something else.

## In Python, names point to values

Here's the key idea, and it surprises a lot of beginners. When you write:

```python
age = 25
```

Python does two things:

1. It creates the value `25` somewhere in memory (an **[object](term:object)**).
2. It sticks a **name tag** called `age` onto it.

A Python [variable](term:variable) is not a box that *contains* the value. It's a **label that points to** a value. You can see the "address" Python uses with `id()`:

```python
age = 25
print(id(age))   # a big number like 4371201456: where the value lives
```

## Two names, one list

This is why the label idea matters:

```python
a = [1, 2, 3]
b = a          # b is a SECOND label on the SAME list
b.append(4)
print(a)       # [1, 2, 3, 4]   ← a changed too!
```

`b = a` didn't copy the list; it made `b` point at the same list in memory. Changing it through either name changes the one list. If you actually want a separate copy:

```python
b = a.copy()   # now b points to a NEW list with the same items
```

Numbers and text behave differently in practice, because they can't be changed in place. Doing `age = age + 1` creates a *new* value 26 and moves the `age` label to it.

## Who cleans up?

When no names point to a value anymore, Python notices and frees its memory automatically. This is called **[garbage collection](term:garbage-collection)**. In some languages, like C, you have to free memory yourself, and forgetting to is a classic source of bugs.

## Try it

Paste the "two names, one list" example into **Python Tutor** (in the resources below) and press *Visualize Execution*. You'll see the arrows from `a` and `b` pointing to the same list. DevPath will have its own memory visualizer in Phase 2.

## Key takeaways

- RAM is a long row of numbered boxes; the numbers are **addresses**.
- A Python variable is a **name that points to a value**, not a box holding it.
- `b = a` makes two names for **one** object. Use `.copy()` to get a separate one.
- Python frees unused memory for you (**garbage collection**).
