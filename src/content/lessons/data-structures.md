One variable holds one value. But real programs deal with *collections*: a playlist of songs, a phone book, a set of tags. **[Data structures](term:data-structure)** are ways of organizing many values. Python has four built-in ones you'll use constantly.

## At a glance

| Structure | Looks like | Ordered? | Changeable? | Duplicates? | Best for |
|---|---|---|---|---|---|
| **list** | `[1, 2, 3]` | ✅ | ✅ | ✅ | A sequence of items in order |
| **tuple** | `(1, 2, 3)` | ✅ | ❌ | ✅ | A fixed group, like coordinates `(x, y)` |
| **dict** | `{"a": 1}` | ✅ | ✅ | keys: ❌ | Looking things up by a key |
| **set** | `{1, 2, 3}` | ❌ | ✅ | ❌ | Unique items, fast "is it in here?" |

"Changeable" has a proper name: **[mutable](term:mutable)**. Lists, dicts and sets are mutable; tuples and strings are **immutable** (they can't be changed after they're made).

## Lists

```python
songs = ["Intro", "Hello", "Outro"]

songs[0]           # "Intro"   ← positions (indexes) start at 0!
songs[-1]          # "Outro"   ← negative counts from the end
songs[0:2]         # ["Intro", "Hello"]   a "slice": from 0 up to (not incl.) 2
len(songs)         # 3

songs.append("Bonus")      # add to the end
songs.insert(1, "Skit")    # add at position 1
songs.remove("Hello")      # remove by value
"Intro" in songs           # True
```

Asking for `songs[10]` when there are only 4 items gives **IndexError: list index out of range**.

## Dictionaries: key → value

A dict is like a real dictionary: you look up a **[key](term:key-value)** (the word) to get its **value** (the definition).

```python
ages = {"Ada": 36, "Grace": 85}

ages["Ada"]               # 36
ages["Linus"] = 54        # add or change an entry
ages.get("Bob", 0)        # 0   ← get() with a default, no error if missing
ages["Bob"]               # KeyError: 'Bob'

for name, age in ages.items():
    print(f"{name} is {age}")
```

Keys must be immutable (strings, numbers, tuples) and unique.

## Tuples

Like a list, but frozen. Use one for things that belong together and shouldn't change:

```python
point = (3, 4)
x, y = point          # "unpacking": x = 3, y = 4
```

## Sets

A set keeps only **unique** items and answers "is X in here?" instantly:

```python
tags = {"python", "web", "python"}   # {"python", "web"}: the duplicate is gone
"web" in tags                       # True

a = {1, 2, 3}
b = {2, 3, 4}
a & b    # {2, 3}  in both
a | b    # {1, 2, 3, 4}  in either
```

## Choosing the right one

- Need **order** and positions? → **list**
- Need to **look up by name/ID**? → **dict**
- Need **uniqueness**, or many "is it in there?" checks? → **set**
- A small fixed **group of values**? → **tuple**

There's a speed reason too. Checking `x in a_list` looks at items one by one, so it gets slower as the list grows. Checking `x in a_set` or `key in a_dict` takes about the same time however big it is. You'll learn to describe this in [Big-O notation](/roadmap/big-o).

## Lists of dictionaries: real-world data

Most real data looks like this, and it's exactly what [JSON](/roadmap/json) looks like too:

```python
students = [
    {"name": "Ada", "score": 92},
    {"name": "Grace", "score": 88},
]
for student in students:
    print(f"{student['name']}: {student['score']}")
```

## Try it

Count how many times each word appears in a sentence: split it with `"the cat and the hat".split()`, then use a dict where each key is a word and each value is its count.

## Key takeaways

- **list** = ordered and changeable; **tuple** = ordered and frozen; **dict** = key → value lookup; **set** = unique items.
- Indexes start at **0**; `[-1]` is the last item.
- Use `.get(key, default)` to avoid `KeyError` on dicts.
- `in` is instant for sets and dicts, but slower for long lists.
