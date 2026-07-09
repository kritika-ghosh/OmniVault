---
title: SQLite3
slug: sqlite3
status: reviewed
last_quiz_date: 2026-07-09
interval_days: 30
---

# SQLite3

`sqlite3` is a built-in Python module that provides a SQL database engine interface compliant with the DB-API 2.0 specification. It allows you to create serverless, self-contained databases locally on disk or in-memory.

## Basic Usage
```python
import sqlite3

conn = sqlite3.connect('example.db')
cursor = conn.cursor()
cursor.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)")
conn.commit()
conn.close()
```
