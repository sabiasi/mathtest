Sorting means putting items in order. Python can do it for you, but learning how sorting algorithms work is the best way to *feel* the difference between [O(n²)](/roadmap/big-o) and O(n log n).

## In practice: just use Python's

```python
numbers = [5, 2, 9, 1]
sorted(numbers)                 # [1, 2, 5, 9]  ← a new list
numbers.sort()                  # sorts the list itself
sorted(numbers, reverse=True)   # [9, 5, 2, 1]

words = ["banana", "Apple", "cherry"]
sorted(words, key=len)          # sort by length: ['Apple', 'banana', 'cherry']
```

## Bubble sort: simple but slow, O(n²)

Walk through the list, swapping neighbors that are in the wrong order. Repeat until nothing swaps. Big values "bubble" to the end.

```python
def bubble_sort(items):
    items = items.copy()
    for end in range(len(items) - 1, 0, -1):
        for i in range(end):
            if items[i] > items[i + 1]:
                items[i], items[i + 1] = items[i + 1], items[i]   # swap
    return items
```

A loop inside a loop gives O(n²): 1,000 items means about 500,000 comparisons.

## Merge sort: divide and conquer, O(n log n)

1. Split the list in half.
2. Sort each half (using [recursion](/roadmap/recursion)!).
3. Merge the two sorted halves by repeatedly taking the smaller front item.

```python
def merge_sort(items):
    if len(items) <= 1:                      # base case
        return items
    middle = len(items) // 2
    left = merge_sort(items[:middle])
    right = merge_sort(items[middle:])

    merged, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            merged.append(left[i]); i += 1
        else:
            merged.append(right[j]); j += 1
    return merged + left[i:] + right[j:]
```

1,000 items means about 10,000 steps instead of 500,000. Python's own `sorted` uses an even smarter algorithm called **Timsort**.

## Try it

Watch the sorting animations on **VisuAlgo** (in the resources below). Phase 2 of DevPath adds a side-by-side sorting race with step counts.

## Key takeaways

- In real code, use `sorted()` or `.sort()`, with `key=` for custom orders.
- **Bubble sort** is easy to understand but O(n²).
- **Merge sort** splits, sorts the halves recursively and merges: O(n log n).
