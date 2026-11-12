Every value in Python has a **[type](term:data-type)**: is it a whole number? Text? True or false? The type decides what you can do with the value. You can add two numbers, but what would it mean to add a number and a word?

## The basic types

| Type | Name | Examples | Used for |
|---|---|---|---|
| `int` | integer | `7`, `-3`, `1_000_000` | Whole numbers: counts, ages |
| `float` | floating-point number | `3.14`, `-0.5`, `2.0` | Numbers with a decimal point |
| `str` | string | `"hello"`, `'Ada'`, `""` | Text: any characters in quotes |
| `bool` | boolean | `True`, `False` | Yes/no answers |
| `NoneType` | none | `None` | "Nothing here" / no value yet |

Ask Python for any value's type with `type()`:

```python
print(type(42))        # <class 'int'>
print(type(4.2))       # <class 'float'>
print(type("42"))      # <class 'str'>   ← quotes make it text!
print(type(True))      # <class 'bool'>
```

## Same symbol, different meaning

The type changes what an operator does:

```python
print(2 + 3)        # 5        (adds numbers)
print("2" + "3")    # 23       (joins strings: "concatenation")
print("ha" * 3)     # hahaha
```

And mixing types that don't fit gives an error:

```python
print("Age: " + 36)   # TypeError: can only concatenate str (not "int") to str
```

## Converting between types

```python
int("36")        # 36     text → whole number
float("3.5")     # 3.5    text → decimal
str(36)          # "36"   number → text
int(3.9)         # 3      cuts off the decimal (it doesn't round!)
int("hello")     # ValueError: there's no number in that text
```

**The #1 beginner trap:** `input()` *always* gives you a string, even if the user typed a number.

```python
age = input("How old are you? ")   # user types 36
print(age + 1)                     # TypeError! age is "36", not 36
age = int(age)                     # convert first
print(age + 1)                     # 37
```

## f-strings: mixing text and values the easy way

Put an `f` before the quotes and any variable in `{curly braces}`:

```python
name = "Ada"
age = 36
print(f"{name} is {age} years old.")   # Ada is 36 years old.
print(f"Price: {19.99 * 3:.2f}")       # Price: 59.97  (.2f = 2 decimal places)
```

No conversion needed, and much easier to read than `+` everywhere.

## Floats are approximate

As you saw in [Binary](/roadmap/binary), `0.1 + 0.2` gives `0.30000000000000004`. For money, round when displaying (`round(x, 2)` or `:.2f`), and never compare floats with `==`.

## Python is dynamically typed

You never write the type yourself. Python works it out from the value, and a name can point to a different type later. (TypeScript, which DevPath is written in, makes you declare types so mistakes are caught earlier. Both approaches have fans.)

## Try it

Write a program that asks for two numbers with `input()`, converts them, and prints their sum with an f-string. Then try typing a word instead of a number. Which error do you get?

## Key takeaways

- The main types are **int**, **float**, **str**, **bool** and **None**.
- The type decides what operators do: `+` adds numbers but joins strings.
- `input()` always returns a **string**. Convert it with `int()` or `float()`.
- Use **f-strings** like `f"Hi {name}"` to put values into text.
