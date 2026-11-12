**[JSON](term:json)** (JavaScript Object Notation) is a simple text format for data. It's the most common way programs send data to each other, and DevPath's own roadmap is stored in it (`src/content/roadmap.json`).

## What it looks like

```json
{
  "name": "Ada",
  "age": 36,
  "isStudent": false,
  "languages": ["Python", "JavaScript"],
  "address": { "city": "London" },
  "nickname": null
}
```

If you know Python [dicts and lists](/roadmap/data-structures), you can already read it:

| JSON | Python |
|---|---|
| `{ "key": value }` object | `dict` |
| `[ ... ]` array | `list` |
| `"text"` | `str` |
| `42`, `3.14` | `int`, `float` |
| `true` / `false` | `True` / `False` |
| `null` | `None` |

## The strict rules

- Keys **must** use double quotes: `"name"`, never `name` or `'name'`.
- No trailing comma after the last item.
- No comments allowed.

Break a rule and the whole file fails to load. (DevPath's content tests catch this for you.)

## JSON in Python

```python
import json

text = '{"name": "Ada", "age": 36}'
data = json.loads(text)          # JSON text → Python dict   (load-s = from a String)
print(data["age"] + 1)           # 37

back = json.dumps(data, indent=2)  # Python dict → JSON text (dump-s = to a String)
```

For files, use `json.load(file)` and `json.dump(data, file)`, without the "s" (see [Working with files](/roadmap/files-io)).

## Try it

Open `src/content/roadmap.json` in VS Code. Find this topic ("json") and check that you can read every field.

## Key takeaways

- JSON is text that looks like Python dicts and lists.
- Strict rules: double quotes, no trailing commas, no comments.
- `json.loads` / `json.dumps` convert between JSON text and Python.
