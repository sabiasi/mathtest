A browser (Chrome, Safari, Firefox) is a program that downloads files from servers and turns them into the pages you see and use.

## From URL to page

1. You type a **[URL](term:url)**. The browser uses [DNS](/roadmap/dns) to find the server's address.
2. It sends an [HTTP](/roadmap/http) request and gets back an **[HTML](term:html)** file.
3. It reads the HTML and builds the **DOM**: a tree of every element on the page (headings, paragraphs, buttons).
4. It downloads the extra files the HTML mentions: **[CSS](term:css)** for style, **[JavaScript](term:javascript)** for behavior, plus images.
5. It works out where everything goes (**layout**) and draws it (**paint**).
6. JavaScript can change the DOM at any time, and the browser redraws the page. That's how pages become interactive.

DevPath works exactly like this: the HTML file is almost empty, and JavaScript (React) builds the whole page in the browser.

## Developer tools: your X-ray glasses

Press **⌥ + ⌘ + I** in any browser:
- **Elements**: the live DOM. Edit text and styles on any site (only on your screen!).
- **Console**: JavaScript errors and messages. Your first stop when a page is broken.
- **Network**: every request the page made, with how long each took.

## Try it

Open DevPath, open developer tools, and in **Elements** find the `<div id="root">`. Everything inside it was created by JavaScript.

## Key takeaways

- The browser fetches HTML, builds a **DOM** tree, then fetches CSS, JS and images.
- JavaScript can change the DOM, which is what makes pages interactive.
- **Developer tools** (⌥ + ⌘ + I) let you see and debug everything.
