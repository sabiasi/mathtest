How do you find one item in a big collection? The answer depends on whether the data is **sorted**, and the difference can be enormous.

## Linear search: check every item

Start at the beginning and look at each item until you find it:

```python
def linear_search(items, target):
    for index, item in enumerate(items):
        if item == target:
            return index
    return -1   # not found
```

It works on any list, sorted or not. But in the worst case it checks **every** item: [O(n)](/roadmap/big-o). For a million items, that's up to a million checks.

## Binary search: halve the problem each time

If the list is **sorted**, you can do much better. It's how you'd find a word in a paper dictionary:

1. Look at the **middle** item.
2. If it's the target, you're done.
3. If the target is **smaller**, throw away the right half; if **bigger**, the left half.
4. Repeat on what's left.

```python
def binary_search(items, target):
    low, high = 0, len(items) - 1
    while low <= high:
        middle = (low + high) // 2     # // divides and rounds down
        if items[middle] == target:
            return middle
        if items[middle] < target:
            low = middle + 1           # target is in the right half
        else:
            high = middle - 1          # target is in the left half
    return -1
```

Each step halves the remaining items, so a million items need only about **20** checks. That's **O(log n)**.

## The catch

Binary search only works on **sorted** data. Sorting first costs time ([Sorting](/roadmap/sorting)), so it pays off when you search the same data many times.

Python has it built in, in the `bisect` module. And for "is it in here?" checks, a `set` is even faster.

## Try it

Guess-the-number: think of a number from 1 to 100 and have a friend guess using binary search ("higher" / "lower"). It never takes more than 7 guesses. Why 7? (Hint: 2⁷ = 128.)

## Key takeaways

- **Linear search** works on anything but is O(n).
- **Binary search** halves the problem each step, O(log n), but needs **sorted** data.
- One million items: up to 1,000,000 checks vs. about 20.
