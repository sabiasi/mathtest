The **[backend](term:backend)** is the part of an app that runs on a [server](/roadmap/servers): it stores data, checks passwords, and answers requests. **FastAPI** is a modern Python **[framework](term:framework)** for building backends that speak [HTTP](/roadmap/http) and [JSON](/roadmap/json). A framework is a ready-made structure you fill in with your own code.

## Hello, API

In a [virtual environment](/roadmap/virtual-environments):

```bash
pip install "fastapi[standard]"
```

**`main.py`**
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def home():
    return {"message": "Hello from my API!"}

@app.get("/square/{number}")
def square(number: int):
    return {"number": number, "square": number * number}
```

```bash
fastapi dev main.py
```

Open `http://127.0.0.1:8000/square/7` and you'll get `{"number": 7, "square": 49}`.

- `@app.get("/square/{number}")` is a **decorator**: it tells FastAPI "when a GET request arrives for this path, run this function".
- `number: int` is a **type hint**. FastAPI uses it to convert and check the input, so `/square/abc` gets a helpful error automatically.
- Returning a dict sends JSON.

## Free documentation

Open `http://127.0.0.1:8000/docs`. FastAPI generates an interactive page listing your **endpoints** (the URLs your API answers), and you can try each one there.

## Receiving data

```python
from pydantic import BaseModel

class Task(BaseModel):
    title: str
    done: bool = False

tasks: list[Task] = []

@app.post("/tasks")
def add_task(task: Task):
    tasks.append(task)
    return task
```

FastAPI reads the JSON body, checks it matches `Task`, and gives you a Python object. (`list[Task]` needs Python 3.9 or newer.)

## Next steps

Store tasks in [SQLite](/roadmap/sql) instead of a list, so they survive restarts. Then build a [frontend](/roadmap/frontend-basics) that calls your API.

## Key takeaways

- The backend runs on the server and answers requests.
- FastAPI turns Python functions into **endpoints** with decorators like `@app.get`.
- Type hints give you input checking and automatic docs at `/docs`.
