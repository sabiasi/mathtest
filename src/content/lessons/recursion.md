**[Recursion](term:recursion)** is when a function **calls itself** to solve a smaller version of the same problem. It sounds like a riddle, but it's a natural fit for problems that contain smaller copies of themselves, like folders inside folders.

## The two parts every recursive function needs

1. A **base case**: the smallest version, answered directly, with no more calls.
2. A **recursive case**: break the problem into a smaller piece and call yourself on it.

## Example: countdown

```python
def countdown(n):
    if n == 0:              # base case
        print("Liftoff!")
        return
    print(n)
    countdown(n - 1)        # recursive case: a smaller problem

countdown(3)   # 3, 2, 1, Liftoff!
```

## Example: factorial

5! ("5 factorial") = 5 × 4 × 3 × 2 × 1 = 120. Notice that 5! = 5 × 4!

```python
def factorial(n):
    if n <= 1:
        return 1                    # base case
    return n * factorial(n - 1)     # recursive case
```

## The call stack

Each call waits for the one it made to finish. Python keeps track of the waiting calls on the **[call stack](term:call-stack)**, a pile where the newest call sits on top:

```
factorial(3) waits for…
  factorial(2) waits for…
    factorial(1) → returns 1
  factorial(2) → 2 × 1 = 2
factorial(3) → 3 × 2 = 6
```

Forget the base case and the stack grows until Python stops it: `RecursionError: maximum recursion depth exceeded`. Phase 2 of DevPath includes an animation of the call stack.

## When to use it

Recursion shines for **tree-shaped** problems: walking through folders, menus, or family trees, and algorithms like merge sort. For simple counting, a loop is usually clearer.

## Key takeaways

- A recursive function **calls itself** on a smaller problem.
- Always have a **base case**, or you'll get `RecursionError`.
- Waiting calls pile up on the **call stack**.
