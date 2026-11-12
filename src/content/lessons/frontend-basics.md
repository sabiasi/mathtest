The **[frontend](term:frontend)** is everything the user sees and touches: the page, the buttons, the forms. It runs in the browser and talks to the [backend](/roadmap/backend-fastapi) over HTTP. Building both makes you a **full-stack** developer.

## Calling your API from JavaScript

The browser's built-in `fetch` function sends HTTP requests:

```html
<button id="load">Load tasks</button>
<ul id="list"></ul>

<script>
  document.querySelector("#load").addEventListener("click", async () => {
    const response = await fetch("http://127.0.0.1:8000/tasks");
    const tasks = await response.json();

    const list = document.querySelector("#list");
    list.innerHTML = "";
    for (const task of tasks) {
      const item = document.createElement("li");
      item.textContent = task.title;
      list.append(item);
    }
  });
</script>
```

- `async` / `await` means "wait for the answer without freezing the page", like the Promises in DevPath's data layer.
- `response.json()` turns the JSON text into JavaScript objects.

## CORS: the first error everyone hits

If your page and your API run on different addresses (ports count!), the browser blocks the request and the Console shows a **CORS** error. It's a security rule: a server must say which websites may call it. In FastAPI, you add `CORSMiddleware` with your frontend's address. Search "FastAPI CORS" in the FastAPI docs.

## Frameworks like React

Plain JavaScript gets messy as pages grow. **React** lets you build the UI from small components that redraw automatically when data changes. DevPath is a React app, so its code in `src/` is a full example to study.

## Key takeaways

- The frontend runs in the browser and calls the backend with `fetch`.
- `await` waits for responses without freezing the page.
- A **CORS** error means the backend must allow your frontend's address.
