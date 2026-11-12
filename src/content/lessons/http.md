**[HTTP](term:http)** (HyperText Transfer Protocol) is the language browsers and servers use to talk. A **[protocol](term:protocol)** is just an agreed set of rules for a conversation. Every web page you open and every [API](/roadmap/apis) call is an HTTP **request** followed by a **response**.

## A request and a response

When you visit `https://example.com/about`, your browser sends a request like this (it's just text!):

```
GET /about HTTP/1.1
Host: example.com
```

And the server answers:

```
HTTP/1.1 200 OK
Content-Type: text/html

<html>...the page...</html>
```

## Methods: what do you want to do?

| Method | Meaning | Example |
|---|---|---|
| `GET` | Read something | Load a page, fetch a user |
| `POST` | Create something | Submit a form, sign up |
| `PUT` / `PATCH` | Update something | Edit your profile |
| `DELETE` | Remove something | Delete a post |

## Status codes

`2xx` = success (200 OK), `3xx` = go somewhere else (redirect), `4xx` = your request was wrong (404 Not Found), `5xx` = the server failed.

## HTTPS

**HTTPS** is HTTP with encryption: nobody between you and the server can read or change the messages. The padlock in your browser's address bar means HTTPS.

## Try it

Open your browser's developer tools (⌥ + ⌘ + I), go to the **Network** tab, and reload any page. Every row is one HTTP request. Click one to see its method, status code and headers.

## Key takeaways

- HTTP is a request → response conversation, written as plain text.
- **Methods** (GET, POST, …) say what you want; **status codes** say how it went.
- HTTPS = HTTP + encryption.
