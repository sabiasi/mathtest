Every web page is built from two languages: **[HTML](term:html)** says **what's on the page** (structure and meaning) and **[CSS](term:css)** says **how it looks** (colors, sizes, layout).

## HTML: the structure

HTML is made of **elements** written with **tags** in angle brackets:

```html
<!doctype html>
<html>
  <head>
    <title>My first page</title>
  </head>
  <body>
    <h1>Hello!</h1>
    <p>This is a paragraph with a <a href="https://python.org">link</a>.</p>
    <ul>
      <li>First item</li>
      <li>Second item</li>
    </ul>
    <button>Click me</button>
  </body>
</html>
```

Most tags come in pairs, `<p>` … `</p>`, and elements nest inside each other like folders. Use the tag that *means* the right thing (`<h1>` for the main heading, `<button>` for buttons), because screen readers and search engines rely on it.

## CSS: the style

CSS picks elements with a **selector** and sets **properties**:

```css
h1 {
  color: teal;
  font-size: 32px;
}

.card {               /* a "class": applies to <div class="card"> */
  padding: 16px;
  border-radius: 12px;
  background: #f1f5f9;
}
```

## DevPath uses Tailwind

Instead of writing separate CSS files, DevPath uses **Tailwind CSS**: small class names written directly on elements, like `class="p-4 rounded-xl bg-slate-100"`. Each one is a tiny piece of CSS. Open any file in `src/components/` to see it in action.

## Try it

Create `index.html` on your Desktop with the example above, then double-click it to open it in your browser. Add a `<style>` block inside `<head>` and make the heading purple.

## Key takeaways

- **HTML** = structure and meaning, built from nested **elements**.
- **CSS** = appearance, using **selectors** + **properties**.
- Use the tag that matches the meaning; style is CSS's job.
