Inside a computer, everything (numbers, text, photos, music, this page) is stored as **0s and 1s**. This lesson shows how that's possible.

## Why only 0 and 1?

A computer is built from billions of tiny electrical switches called **transistors**. A switch is either **off (0)** or **on (1)**. Two states are easy to tell apart reliably, even when electricity is a little noisy, so computers count with just two digits. That's the **[binary](term:binary)** number system.

One 0-or-1 is called a **[bit](term:bit)**. Eight bits make a **[byte](term:byte)**.

## Counting in binary

You already know decimal (base 10): each place is worth 10 times the one to its right, so 1s, 10s, 100s and so on.

Binary (base 2) works the same way, but each place is worth **2 times** the one to its right:

| 8s | 4s | 2s | 1s | Decimal |
|---|---|---|---|---|
| 0 | 0 | 0 | 1 | 1 |
| 0 | 0 | 1 | 0 | 2 |
| 0 | 1 | 0 | 1 | 4 + 1 = **5** |
| 1 | 1 | 0 | 1 | 8 + 4 + 1 = **13** |
| 1 | 1 | 1 | 1 | 8 + 4 + 2 + 1 = **15** |

To read binary, add up the place values wherever there's a 1. With 8 bits (one byte) you can count from 0 to 255.

Python can convert for you:

```python
print(bin(13))          # 0b1101   ("0b" means "this is binary")
print(int("1101", 2))   # 13       (read "1101" as base 2)
```

## Text is numbers too

Every character has a number. In the standard called **Unicode**, `A` is 65, `B` is 66, `a` is 97, and even emoji have numbers: 😀 is 128512.

```python
print(ord("A"))   # 65   (character → number)
print(chr(66))    # B    (number → character)
```

So the word `Hi` is stored as the numbers 72 and 105, which are stored as bits.

## Why 0.1 + 0.2 isn't exactly 0.3

Try this in Python:

```python
print(0.1 + 0.2)   # 0.30000000000000004
```

It isn't a bug in Python. Just as 1/3 can't be written exactly in decimal (0.3333…), 0.1 can't be written exactly in binary. The computer stores the closest possible value, and tiny rounding differences appear. It's why you shouldn't compare decimal numbers with `==`. You'll see this again in [Data types](/roadmap/data-types).

## Try it

1. Write your age in binary on paper, then check it with `bin()` in Python.
2. What's the largest number you can make with 4 bits? (Hint: all 1s.)
3. Play a round of the Cisco Binary Game in the resources below.

## Key takeaways

- Computers use **binary** because switches have two states: off (0) and on (1).
- A **bit** is one 0/1; a **byte** is 8 bits, enough for numbers 0 to 255.
- Each binary place is worth double the one to its right: 1, 2, 4, 8, 16…
- Text, images and sound are all stored as numbers, and numbers are stored as bits.
