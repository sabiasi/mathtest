Documentation is writing that helps people **use** and **understand** your code, including you, six months from now. A great project nobody can figure out how to run is a project nobody uses.

## The README: your project's front door

`README.md` is the first thing people see on GitHub. A good one answers:

1. **What** is this, and why does it exist? (one or two sentences)
2. **How do I run it?** Exact commands, explained.
3. **How do I use it?** An example or a screenshot.
4. **How is it organized?** For bigger projects.

DevPath's own `README.md` follows this pattern. Open it and take a look.

`.md` means **[Markdown](term:markdown)**, a simple way to format text: `# Heading`, `**bold**`, `- list item`, and code in backticks. DevPath's lessons are written in Markdown too.

## Docstrings: documentation inside the code

A **docstring** is a string right under a `def` or `class` that explains it:

```python
def average(numbers):
    """Return the mean of a list of numbers.

    Returns 0 for an empty list instead of raising an error.
    """
```

Editors show docstrings when you hover over a function, and `help(average)` prints them.

## Comments

Use comments for the **why** that code can't express ([Clean code](/roadmap/clean-code)). If you need a comment to explain *what* code does, try a clearer name first.

## Keep it true

Wrong documentation is worse than none. When you change behavior, update the docs in the same commit.

## Key takeaways

- A **README** says what the project is, how to run it, and how to use it.
- **Docstrings** document functions and classes right in the code.
- Out-of-date docs mislead people. Update them together with the code.
