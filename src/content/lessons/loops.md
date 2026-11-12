Computers are amazing at repetition: they never get bored. A **[loop](term:loop)** runs the same block of code many times, so ten lines can handle a million items.

## for loops: "do this for each item"

```python
fruits = ["apple", "banana", "cherry"]

for fruit in fruits:
    print(f"I like {fruit}")
```

Output:
```
I like apple
I like banana
I like cherry
```

Each time around (each **[iteration](term:iteration)**), the name `fruit` points to the next item. The loop ends when the items run out. You can loop over strings too: `for letter in "hello":`.

## range(): counting

`range()` produces numbers to loop over:

```python
for i in range(5):        # 0, 1, 2, 3, 4   (5 numbers, starting at 0!)
    print(i)

for i in range(1, 6):     # 1, 2, 3, 4, 5   (start at 1, stop BEFORE 6)
    print(i)

for i in range(0, 10, 2): # 0, 2, 4, 6, 8   (step by 2)
    print(i)
```

The end number is **not included**. Forgetting this causes **off-by-one errors**, among the most common bugs in all of programming.

## while loops: "keep going as long as…"

Use `while` when you don't know in advance how many times to repeat:

```python
password = ""
while password != "open sesame":
    password = input("Password: ")
print("Welcome!")
```

The condition is checked before each round. When it becomes false, the loop stops.

⚠️ If the condition never becomes false, you get an **infinite loop**: the program runs forever. Press **Ctrl + C** in the terminal to stop it.

## break and continue

```python
for number in range(1, 100):
    if number % 2 == 0:    # % gives the remainder; even numbers have remainder 0
        continue           # skip the rest of this round, go to the next number
    if number > 9:
        break              # leave the loop completely
    print(number)          # prints 1 3 5 7 9
```

## The accumulator pattern

A very common shape: start with an empty result, then build it up inside the loop.

```python
prices = [4.50, 12.00, 3.25]
total = 0                      # 1. start empty
for price in prices:
    total += price             # 2. add each item
print(f"Total: {total:.2f}")   # 3. use the result → Total: 19.75
```

The same shape works for counting, finding the largest value, building a new list, and much more.

## Try it

1. Print the 7 times table from 7 × 1 to 7 × 10.
2. Using the accumulator pattern, count how many words in `["hi", "hello", "hey", "greetings"]` are longer than 3 letters.

## Key takeaways

- `for` loops go through each item in a collection; `while` loops repeat while a condition is true.
- `range(a, b)` counts from `a` up to, but **not including**, `b`.
- `break` exits the loop; `continue` skips to the next round.
- Infinite loop? **Ctrl + C**. And the **accumulator pattern** (start empty, build up) is everywhere.
