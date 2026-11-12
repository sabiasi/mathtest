**[Object-oriented programming](term:oop)** (OOP) is a way of organizing code by bundling **data** together with the **functions that work on that data**. The bundle is called an **[object](term:object)**, and the blueprint for making objects is a **[class](term:class)**.

## You've been using objects all along

```python
name = "ada"
name.upper()        # "ADA"
songs = []
songs.append("Hi")
```

`name` is a `str` object, and `.upper()` is a function that belongs to it. `songs` is a `list` object with an `.append()` function. Functions that belong to objects are called **[methods](term:method)**.

## Making your own class

Let's model a bank account. Every account has data (an owner, a balance) and actions (deposit, withdraw):

```python
class BankAccount:
    """A simple bank account."""

    def __init__(self, owner, balance=0):
        # __init__ runs when a new account is created.
        # It stores the starting data ON the object.
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):
        self.balance += amount

    def withdraw(self, amount):
        if amount > self.balance:
            print("Not enough money!")
            return
        self.balance -= amount

    def __str__(self):
        # What print() shows for this object
        return f"{self.owner}: ${self.balance:.2f}"
```

Using it:

```python
ada = BankAccount("Ada", 100)    # create an object (an "instance")
grace = BankAccount("Grace")     # another, separate one

ada.deposit(50)
grace.deposit(20)
ada.withdraw(500)                # Not enough money!

print(ada)      # Ada: $150.00
print(grace)    # Grace: $20.00
```

One class, many objects, and each has its **own** data.

## What is `self`?

`self` means **"this particular object"**. When you call `ada.deposit(50)`, Python secretly runs `BankAccount.deposit(ada, 50)`, so inside the method `self` *is* `ada`. That's how `self.balance` changes Ada's balance and not Grace's.

Every method's first parameter is `self`. Forgetting it is a very common error:
`TypeError: deposit() takes 1 positional argument but 2 were given`.

## The vocabulary

| Word | Meaning | In the example |
|---|---|---|
| class | The blueprint | `BankAccount` |
| object / instance | A thing made from the blueprint | `ada`, `grace` |
| attribute | Data stored on an object | `self.balance` |
| method | A function that belongs to a class | `deposit()` |
| `__init__` | The setup method, run on creation | sets `owner`, `balance` |

## Inheritance: building on a class

A class can be based on another one and add to it:

```python
class SavingsAccount(BankAccount):
    def add_interest(self, rate):
        self.deposit(self.balance * rate)

savings = SavingsAccount("Linus", 1000)
savings.add_interest(0.05)     # it has deposit() too, inherited for free
print(savings)                 # Linus: $1050.00
```

Use **[inheritance](term:inheritance)** sparingly: it's powerful but can make code hard to follow. Beginners often overuse it.

## When should you use a class?

Use a class when you have **data and behavior that belong together**, and especially when you need **many of the same kind of thing** (many accounts, many players, many tasks). For a quick script, plain functions and dicts are often simpler, and that's fine!

## Try it

Write a `Dog` class with a `name` and a `tricks` list. Add a method `learn(trick)` that adds to the list, and a `__str__` that prints something like `Rex knows: sit, roll`.

## Key takeaways

- A **class** is a blueprint; an **object** is one thing built from it.
- `__init__` sets up a new object; `self` means "this particular object".
- **Attributes** are an object's data; **methods** are its functions.
- Use classes when data and behavior belong together. Simple scripts often don't need them.
