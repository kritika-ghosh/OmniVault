---
title: Pydantic
slug: pydantic
status: reviewed
last_quiz_date: 2026-07-09
interval_days: 1
---

# Pydantic

Pydantic is a data validation and settings management library using Python type annotations. It enforces type hints at runtime and provides user-friendly errors when data is invalid.

## Core Concepts
- **BaseModel:** The primary class for defining structured data schemas.
- **Field:** Used to customize metadata, validations, and default values for model fields.
- **ValidationError:** Raised when validation fails, containing details about which fields failed and why.
