As programs grow, keeping everything in one file gets messy. A **[module](term:module)** is simply a Python file whose code you can use from another file with `import`. Modules also unlock Python's biggest superpower: thousands of ready-made tools.

## Importing from the standard library

Python comes with a huge **[standard library](term:standard-library)**, a set of modules that are always available. No installing needed:

```python
import math
print(math.sqrt(16))      # 4.0
print(math.pi)            # 3.141592653589793

import random
print(random.randint(1, 6))           # a dice roll
print(random.choice(["rock", "paper", "scissors"]))

from datetime import date
print(date.today())       # 2026-11-12
```

## Three ways to import

```python
import math                  # use as math.sqrt(...)  ← clear where it came from
from math import sqrt        # use as sqrt(...)       ← shorter
import datetime as dt        # use as dt.date(...)    ← a nickname
```

`import math` is often clearest, because the reader sees `math.` and knows where `sqrt` lives. Avoid `from math import *` (import everything): it's impossible to tell what came from where.

## Making your own module

Any `.py` file is a module. Create two files in the same folder:

**`helpers.py`**
```python
def shout(text):
    return text.upper() + "!"
```

**`main.py`**
```python
import helpers

print(helpers.shout("hello"))   # HELLO!
```

Run `python3 main.py`. Python finds `helpers.py` because it's in the same folder.

## `if __name__ == "__main__":`

You'll see this line everywhere:

```python
def shout(text):
    return text.upper() + "!"

if __name__ == "__main__":
    # Only runs when you run THIS file directly,
    # not when another file imports it.
    print(shout("testing"))
```

When you run a file directly, Python sets its special variable `__name__` to `"__main__"`. When it's imported, `__name__` is the module's name instead. This lets one file be both a reusable module and a runnable script.

## Packages from the internet

Beyond the standard library, the Python community has published hundreds of thousands of **[packages](term:package)** on **PyPI** (the Python Package Index). You install them with **pip**:

```bash
pip install requests
```

Then `import requests` works like any other module. Before installing packages, learn about [virtual environments](/roadmap/virtual-environments), so each project keeps its own set.

## A classic trap: shadowing

If you name your own file `random.py` and then write `import random`, Python imports **your file** instead of the real one, and you get confusing errors like `AttributeError: module 'random' has no attribute 'randint'`. Never name your files after modules you use (`random.py`, `math.py`, `json.py`, `requests.py`…).

## Try it

Make a `dice.py` module with a `roll(sides=6)` function using `random.randint`. Import it in `main.py` and roll five dice. Add an `if __name__ == "__main__":` block to `dice.py` that rolls once, then notice it *doesn't* run when you run `main.py`.

## Key takeaways

- A **module** is a Python file you can `import`.
- The **standard library** (`math`, `random`, `datetime`, `json`…) is built in; other **packages** come from PyPI via `pip`.
- `if __name__ == "__main__":` code runs only when the file is run directly.
- Don't name your files after modules you import.
