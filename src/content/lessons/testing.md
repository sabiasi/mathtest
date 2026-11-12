A **[test](term:test)** is a small piece of code that checks other code works. Instead of running your program and eyeballing the output each time, you write the check once and run it whenever you like, in seconds.

## Why test?

- **Confidence to change things.** Tests tell you right away if a change broke something.
- **Fewer surprises.** Writing tests makes you think about edge cases (an empty list? a negative number?).
- **Living documentation.** A test shows exactly how code is meant to be used.

## Your first tests with pytest

**`calculator.py`**
```python
def average(numbers):
    if not numbers:
        return 0
    return sum(numbers) / len(numbers)
```

**`test_calculator.py`**
```python
from calculator import average

def test_average_of_three_numbers():
    assert average([2, 4, 6]) == 4

def test_average_of_empty_list_is_zero():
    assert average([]) == 0
```

`assert` means "this must be true, or the test fails". Install pytest and run it (inside a [virtual environment](/roadmap/virtual-environments)):

```bash
pip install pytest
pytest
```

pytest finds every file named `test_*.py` and every function named `test_*`, runs them, and reports what passed and what failed, with the exact values.

## DevPath has tests too

DevPath uses **Vitest**, the same idea for TypeScript. Run `npm test` in your `Phyton` folder, then open `src/data/localStorageRepository.test.ts` and `src/data/content.test.ts`. The second one checks every lesson and quiz file for mistakes.

## A good test…

- checks **one** behavior, with a name that says which,
- covers **edge cases**, not just the happy path,
- has been seen to **fail**: break the code on purpose once, to prove the test can catch it.

## Key takeaways

- Tests are code that checks code; run them after every change.
- `assert` states what must be true; `pytest` finds and runs your tests.
- Test the edge cases, and make sure each test can fail.
