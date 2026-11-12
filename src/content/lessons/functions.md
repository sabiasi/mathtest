A **[function](term:function)** is a named, reusable block of code. You've already used some: `print()`, `len()`, `input()`. Now you'll make your own. Functions are the main way real programs stay organized.

## Defining and calling

```python
def greet(name):
    """Say hello to someone by name."""
    print(f"Hello, {name}!")

greet("Ada")      # Hello, Ada!
greet("Grace")    # Hello, Grace!
```

- `def` starts a function **definition**. Nothing runs yet; you're just teaching Python a new word.
- `name` is a **[parameter](term:parameter)**: a placeholder for the input.
- `greet("Ada")` is a **call**: it runs the function, and `"Ada"` is the **argument** (the actual value).
- The text in triple quotes is a **docstring**: it describes what the function does.

## return: giving back a result

`print` shows something on screen. `return` **hands a value back** to whoever called the function, so they can use it:

```python
def area(width, height):
    return width * height

room = area(4, 5)          # room is now 20
total = room + area(2, 3)  # you can use the result in calculations: 26
```

This is the most important difference to understand:

```python
def add_print(a, b):
    print(a + b)    # shows 5 on screen, then gives back… nothing (None)

def add_return(a, b):
    return a + b    # gives back 5

x = add_print(2, 3)    # prints 5
print(x)               # None  ← the value is gone!
y = add_return(2, 3)
print(y * 10)          # 50
```

A function with no `return` gives back `None`. `return` also **ends** the function immediately.

## Default values

```python
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

greet("Ada")             # "Hello, Ada!"
greet("Ada", "Welcome")  # "Welcome, Ada!"
```

## Scope: what stays inside

Variables created inside a function are **local**: they exist only while the function runs, and the outside world can't see them.

```python
def make_total():
    total = 100
    return total

make_total()
print(total)   # NameError: total only existed inside the function
```

This is a feature: functions can't accidentally mess with each other's variables. The idea of where a name is visible is called **[scope](term:scope)**.

## Why bother?

- **Don't repeat yourself.** Write the logic once, call it many times. Fix a bug once, and it's fixed everywhere.
- **Naming.** `calculate_tax(price)` tells the reader *what* happens without them reading *how*.
- **Testing.** A small function with inputs and a return value is easy to check ([Testing](/roadmap/testing)).

A good function does **one thing**, has a name that says what that is (usually a verb: `calculate_`, `get_`, `is_`), and is short enough to see on one screen.

## Try it

Write `is_even(number)` that **returns** `True` or `False`. Then use it in a loop to print only the even numbers from 1 to 20.

## Key takeaways

- `def` defines a function; calling it runs it. **Parameters** are placeholders, **arguments** are the actual values.
- `return` hands a value back; `print` only shows it. No `return` means `None`.
- Variables inside a function are **local** (that's scope).
- Good functions do one thing and have clear verb names.
