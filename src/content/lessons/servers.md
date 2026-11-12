A **[server](term:server)** is a computer, or a program on it, that waits for requests and answers them. The device making the request is the **[client](term:client)**. Your browser is a client; the computer sending back the page is a server.

## The client–server model

```
 client (browser, app)  ──request──▶  server
                        ◀──response──
```

A server is usually just a normal computer in a data center, with no screen, running all day. "The cloud" means other people's servers that you rent.

## Two kinds of answers

- **Static**: the server sends back a file that already exists, unchanged for every visitor (an image, a plain HTML page). It's simple and fast.
- **Dynamic**: the server *runs code* to build the answer: it looks up your account in a [database](/roadmap/databases), calculates something, and returns the result. That code is the **backend**, and you'll write one with [FastAPI](/roadmap/backend-fastapi).

## You've already run a server!

When you ran `npm run dev`, Vite started a small server on your own computer at `localhost:5173`. Your browser (the client) sent it requests, and it answered with DevPath's files.

## Ports

One computer can run many servers. A **[port](term:port)** number says which one you mean: `localhost:5173` is Vite, web servers usually use port 443 (HTTPS) or 80 (HTTP).

## Key takeaways

- **Clients** send requests; **servers** answer them.
- **Static** servers send files; **dynamic** servers run code (a backend) to build answers.
- A **port** picks which server on a computer you're talking to.
