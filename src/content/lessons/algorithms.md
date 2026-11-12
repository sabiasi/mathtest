An **[algorithm](term:algorithm)** is a precise, step-by-step recipe for solving a problem. You use them every day without the name: looking up a word in a dictionary, following directions, sorting a hand of cards.

## A tiny example: find the largest number

In plain words:
1. Remember the first number as "the largest so far".
2. Look at each remaining number. If it's bigger, remember it instead.
3. When you've looked at them all, "the largest so far" is the answer.

In Python:

```python
def largest(numbers):
    biggest = numbers[0]
    for n in numbers[1:]:
        if n > biggest:
            biggest = n
    return biggest
```

(Python has `max()` built in, but writing it yourself is how you learn to think in steps.)

## What makes a good algorithm?

- **Correct**: it gives the right answer for *every* valid input, including the tricky ones. What does `largest([])` do? (It crashes. That's an **edge case**.)
- **Clear**: another person can follow it.
- **Efficient**: it doesn't waste time or memory. How we measure that is [Big-O](/roadmap/big-o).

## How to design one

1. Solve a small example **by hand**, on paper. Notice what *you* did.
2. Write those steps in plain words (**pseudocode**).
3. Turn them into code.
4. Test with normal cases *and* edge cases: empty input, one item, duplicates, negative numbers.

## Try it

Write an algorithm, in words first and then in Python, that checks whether a word is a **palindrome** (reads the same backwards, like "level"). Test it with `""` and `"a"` too.

## Key takeaways

- An algorithm is a precise, step-by-step recipe.
- Good algorithms are **correct**, **clear** and **efficient**.
- Solve by hand → write pseudocode → write code → test the edge cases.
