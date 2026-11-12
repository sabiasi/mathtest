Code that runs instantly on 10 items might take hours on 10 million. **[Big-O notation](term:big-o)** describes **how the work grows as the input grows**. It doesn't count seconds, which depend on the computer; it describes the *shape* of the growth.

## The common ones, fastest to slowest

`n` means "the size of the input", for example how many items are in the list.

| Big-O | Name | Example | 1,000 items → about |
|---|---|---|---|
| O(1) | constant | Get `my_list[5]`, look up a dict key | 1 step |
| O(log n) | logarithmic | [Binary search](/roadmap/searching) | 10 steps |
| O(n) | linear | Loop over every item once | 1,000 steps |
| O(n log n) | "n log n" | Good sorting (Python's `sorted`) | 10,000 steps |
| O(n²) | quadratic | A loop inside a loop | 1,000,000 steps |

## Spotting it in code

```python
def first(items):            # O(1): same work whatever the size
    return items[0]

def total(items):            # O(n): one pass over the items
    result = 0
    for x in items:
        result += x
    return result

def has_duplicate(items):    # O(n²): a loop inside a loop
    for a in range(len(items)):
        for b in range(a + 1, len(items)):
            if items[a] == items[b]:
                return True
    return False
```

The faster version of `has_duplicate` uses a [set](/roadmap/data-structures), which checks `in` in O(1):

```python
def has_duplicate(items):    # O(n)
    seen = set()
    for x in items:
        if x in seen:
            return True
        seen.add(x)
    return False
```

## Rules of thumb

- Drop constants: two separate loops is O(2n), but we just say **O(n)**.
- Keep only the biggest term: O(n² + n) is just **O(n²)**.
- `x in some_list` is O(n); `x in some_set` is O(1).

## Key takeaways

- Big-O describes how work **grows** with input size `n`.
- O(1) < O(log n) < O(n) < O(n log n) < O(n²).
- Nested loops over the same data usually mean **O(n²)**. A set or dict can often fix that.
