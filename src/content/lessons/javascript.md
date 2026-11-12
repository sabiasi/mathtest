**[JavaScript](term:javascript)** (JS) is the programming language that runs in every web browser. It makes pages interactive, and with [Node.js](term:nodejs) it runs on servers too. DevPath itself is written in TypeScript, which is JavaScript plus types.

## Python → JavaScript

Good news: you already know the ideas. Only the spelling changes.

```python
# Python
name = "Ada"
scores = [90, 85, 77]

def average(numbers):
    return sum(numbers) / len(numbers)

if average(scores) > 80:
    print(f"Great job, {name}!")

for score in scores:
    print(score)
```

```javascript
// JavaScript
const name = "Ada";
const scores = [90, 85, 77];

function average(numbers) {
  const total = numbers.reduce((sum, n) => sum + n, 0);
  return total / numbers.length;
}

if (average(scores) > 80) {
  console.log(`Great job, ${name}!`);
}

for (const score of scores) {
  console.log(score);
}
```

## The main differences

| Python | JavaScript |
|---|---|
| Indentation makes blocks | `{ curly braces }` make blocks (indent anyway!) |
| `x = 5` | `const x = 5` (can't be reassigned) or `let x = 5` (can) |
| `print()` | `console.log()` |
| `f"Hi {name}"` | `` `Hi ${name}` `` (backticks) |
| `True` / `False` / `None` | `true` / `false` / `null` (and `undefined`) |
| `and` / `or` / `not` | `&&` / `\|\|` / `!` |
| `len(items)` | `items.length` |
| `dict` | object: `{ name: "Ada" }` |

⚠️ In JavaScript, use `===` to compare, never `==`. `==` does strange automatic conversions (`"5" == 5` is `true`!).

## JavaScript in the browser

JS can find and change elements on the page:

```javascript
const button = document.querySelector("button");
button.addEventListener("click", () => {
  button.textContent = "Clicked!";
});
```

## Try it

Open your browser's developer tools (⌥ + ⌘ + I) → **Console**, and type `console.log(2 + 2)`, then `[1, 2, 3].map(n => n * 10)`. The console is a JavaScript playground on every website. DevPath's Code Lab (Phase 2) will let you run JS and Python side by side.

## Key takeaways

- JavaScript runs in every browser, and on servers with Node.js.
- The concepts (variables, loops, functions) are the same as Python; the syntax differs.
- Use `const` by default, `let` when the value changes, and `===` for comparisons.
