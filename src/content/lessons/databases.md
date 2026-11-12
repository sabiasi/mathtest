A **[database](term:database)** is a program built to store data safely and find it fast, even when there are millions of records and many users at once. Almost every real app has one behind it.

## Why not just use files?

A JSON file works for one person's small to-do list. But what if 1,000 users save at the same moment? What if you need "all orders over $50 from last March" out of 10 million orders? What if the power cuts out halfway through saving? Databases solve all of this: safe simultaneous access, fast searching, and no half-saved data.

## Tables, rows and columns

The most common kind, a **relational** database, stores data in **tables**, like spreadsheets:

**users**

| id | name | email |
|---|---|---|
| 1 | Ada | ada@example.com |
| 2 | Grace | grace@example.com |

- Each **row** is one record (one user).
- Each **column** is one field, with a fixed type.
- The `id` is a **primary key**: a unique number for each row.

Tables link to each other by these ids. An `orders` table can have a `user_id` column pointing to a row in `users`.

## Popular databases

- **SQLite**: a whole database in a single file, built into Python (`import sqlite3`). Perfect for learning.
- **PostgreSQL**: the favorite for serious web apps.
- **MySQL**: very widely used.

You talk to all of them with **[SQL](/roadmap/sql)**.

## DevPath and databases

DevPath v1 saves your data in your browser's localStorage. But its code talks to a "repository" interface (`src/data/repository.ts`), so a real database can be added later without changing the pages.

## Key takeaways

- Databases store data **safely** and make searching **fast**, at any size.
- Relational databases use **tables** of **rows** and **columns**, linked by **ids**.
- Start with **SQLite**: it's already in Python.
