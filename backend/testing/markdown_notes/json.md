---
title: JSON
tags: data-format, serialization, deserialization
status: draft
created: 2023-12-01
updated: 2023-12-01
---

# JSON
## Overview
JSON (JavaScript Object Notation) is a lightweight, human-readable data interchange format that is widely used for exchanging data between web servers, web applications, and mobile apps. It is a text-based format that represents data as key-value pairs, arrays, and objects. JSON is language-independent, making it a popular choice for data exchange between different programming languages and environments.

## Core Syntax / API
The core syntax of JSON includes the following elements:
* **Objects**: represented as `{}` and containing key-value pairs, where keys are strings and values can be strings, numbers, booleans, arrays, or objects.
* **Arrays**: represented as `[]` and containing ordered lists of values, which can be strings, numbers, booleans, arrays, or objects.
* **Values**: can be strings (represented as `"string"`), numbers (represented as `123`), booleans (represented as `true` or `false`), arrays, or objects.
* **Key-Value Pairs**: represented as `"key": value`, where `key` is a string and `value` can be any of the above-mentioned types.
Some common JSON APIs include:
* **Parsing**: converting a JSON string into a native data structure, such as an object or array.
* **Stringification**: converting a native data structure into a JSON string.
* **Serialization**: converting data into a JSON string, often for storage or transmission.
* **Deserialization**: converting a JSON string back into native data.

## Common Pitfalls
Some common pitfalls to watch out for when working with JSON include:
* **Trailing Commas**: JSON does not allow trailing commas in objects or arrays, which can cause parsing errors.
* **Invalid Characters**: JSON only allows a limited set of characters, such as letters, numbers, and a few special characters. Using invalid characters can cause parsing errors.
* **Depth Limits**: some JSON parsers may have depth limits, which can cause errors when working with deeply nested data structures.
* **Data Type Mismatches**: JSON is a loosely-typed format, which can lead to data type mismatches when exchanging data between different systems or languages.

## Related Concepts
Some related concepts to JSON include:
* **XML**: another popular data interchange format, which is more verbose and less human-readable than JSON.
* **CSV**: a comma-separated values format, often used for exchanging tabular data.
* **Protobuf**: a binary data interchange format, developed by Google, which is more efficient and compact than JSON.
* **Data Serialization**: the process of converting data into a format that can be stored or transmitted, such as JSON, XML, or CSV.