**[SQL](term:sql)** (Structured Query Language, said "S-Q-L" or "sequel") is the language for asking a [database](/roadmap/databases) questions. It reads almost like English.

## Asking questions with SELECT

Using a `users` table with `id`, `name`, `age` and `city` columns:

```sql
SELECT name, age FROM users;                    -- two columns, every row
SELECT * FROM users WHERE city = 'London';      -- * = all columns; WHERE filters rows
SELECT * FROM users WHERE age >= 18 ORDER BY age DESC;   -- sort, oldest first
SELECT COUNT(*) FROM users;                     -- how many users?
SELECT city, COUNT(*) FROM users GROUP BY city; -- how many per city?
```

## Changing data

```sql
INSERT INTO users (name, age, city) VALUES ('Ada', 36, 'London');
UPDATE users SET age = 37 WHERE name = 'Ada';
DELETE FROM users WHERE id = 5;
```

⚠️ `UPDATE` or `DELETE` **without** `WHERE` affects **every row**. Always double-check the `WHERE`.

## Joining tables

`JOIN` combines tables using their linking ids:

```sql
SELECT users.name, orders.total
FROM orders
JOIN users ON orders.user_id = users.id;
```

## SQL from Python

```python
import sqlite3

db = sqlite3.connect("shop.db")      # creates the file if it doesn't exist
db.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)")
db.execute("INSERT INTO users (name) VALUES (?)", ("Ada",))   # ? = a safe placeholder
db.commit()
for row in db.execute("SELECT * FROM users"):
    print(row)
```

Always use `?` placeholders for values, never f-strings. Putting user input directly into SQL allows **SQL injection**, one of the most common security holes on the web.

## Try it

Do the first five lessons on **SQLBolt** (in the resources below). Each one takes about 10 minutes.

## Key takeaways

- `SELECT … FROM … WHERE … ORDER BY` asks questions; `INSERT`, `UPDATE` and `DELETE` change data.
- `JOIN` combines tables through their ids.
- Use `?` placeholders in code to prevent **SQL injection**.
