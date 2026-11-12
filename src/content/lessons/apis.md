An **[API](term:api)** (Application Programming Interface) is a way for one program to ask another program for something. When a weather app shows the forecast, it didn't measure the weather. It asked a weather service's API.

## The restaurant analogy

You (the program) don't walk into the kitchen (the other system). You read the **menu** (the API documentation), tell the **waiter** what you want (send a **request**), and the waiter brings back your food (the **response**). The menu limits what you can ask for, and that's what makes it reliable.

You've already used one kind of API: Python's `math.sqrt()` is the `math` module's API. This lesson is about **web APIs**: asking a server on the internet for data.

## A web API request

Web APIs work over [HTTP](/roadmap/http), the same system your browser uses. You send a request to a URL, and you usually get back data in [JSON](/roadmap/json) format. Try opening this in your browser:

```
https://api.github.com/users/octocat
```

You'll see JSON data about GitHub's mascot account. That's an API response!

## Calling an API from Python

The popular `requests` package makes this easy. Install it first, ideally inside a [virtual environment](/roadmap/virtual-environments):

```bash
pip install requests
```

```python
import requests

response = requests.get("https://api.github.com/users/octocat", timeout=10)

print(response.status_code)    # 200 means "OK"
data = response.json()         # turn the JSON text into a Python dict
print(data["name"])            # The Octocat
print(data["public_repos"])    # a number
```

`timeout=10` means "give up after 10 seconds instead of waiting forever". Always set one.

## Status codes: did it work?

Every response has a number that says how it went:

| Code | Meaning |
|---|---|
| `200` | OK, here's your data |
| `201` | Created (after sending new data) |
| `400` | Bad request: something's wrong with what you sent |
| `401` / `403` | Not logged in / not allowed |
| `404` | Not found |
| `429` | Too many requests: slow down |
| `500` | The server broke (not your fault!) |

Check the status before using the data:

```python
if response.status_code == 200:
    data = response.json()
else:
    print(f"Something went wrong: {response.status_code}")
```

Or let requests raise an error for you: `response.raise_for_status()`.

## Sending information

Many APIs take **query parameters**: extra options in the URL after a `?`:

```python
response = requests.get(
    "https://api.github.com/search/repositories",
    params={"q": "language:python", "sort": "stars"},   # → ?q=language:python&sort=stars
    timeout=10,
)
top = response.json()["items"][0]
print(top["full_name"])
```

## API keys: keep them secret

Many APIs need an **[API key](term:api-key)**: a secret password that identifies your program. Rules:
- **Never** put keys directly in your code, and never commit them to [Git](/roadmap/git). Public GitHub repos are scanned by bots within minutes.
- Store them in an **environment variable** or a `.env` file that's listed in `.gitignore`.

APIs also have **rate limits** (a maximum number of requests per minute or hour). A `429` code means you hit one.

## Try it

Use the public API at `https://api.github.com/users/<username>` to write a program that asks for a GitHub username and prints the user's name and number of public repositories. Handle the `404` case for a username that doesn't exist.

## Key takeaways

- An **API** is a menu of things one program can ask another for.
- Web APIs use **HTTP** requests to URLs and usually answer in **JSON**.
- Check the **status code**: 200 is good, 4xx means your request was wrong, 5xx means the server failed.
- Keep **API keys** out of your code and out of Git.
