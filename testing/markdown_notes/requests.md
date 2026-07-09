---
title: Requests
slug: requests
status: reviewed
last_quiz_date: 2026-07-09
interval_days: 7
---

# Requests

Requests is an elegant and simple HTTP library for Python, built for human beings. It allows you to send HTTP/1.1 requests extremely easily without manually adding query strings to your URLs or POST-encoding your data.

## Basic Usage
```python
import requests

response = requests.get('https://api.github.com/events')
print(response.status_code)
print(response.json())
```
