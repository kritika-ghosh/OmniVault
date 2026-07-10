---
title: NumPy Guide
tags: [numpy, python, numerical-computing]
status: draft
created: 2023-12-01
updated: 2023-12-01
---

# NumPy
## Overview
NumPy (Numerical Python) is a library for working with arrays and mathematical operations in Python. It is a fundamental package for scientific computing and data analysis in Python. NumPy provides support for large, multi-dimensional arrays and matrices, and provides a wide range of high-performance mathematical functions to manipulate them.

## Core Syntax / API
NumPy's core syntax and API revolve around the `ndarray` object, which represents a multi-dimensional array of values. Here are some key aspects of NumPy's syntax and API:
* Importing NumPy: `import numpy as np`
* Creating arrays: `np.array()`, `np.zeros()`, `np.ones()`, `np.random.rand()`
* Array indexing and slicing: `arr[index]`, `arr[start:stop:step]`
* Mathematical operations: `np.add()`, `np.subtract()`, `np.multiply()`, `np.divide()`
* Statistical functions: `np.mean()`, `np.median()`, `np.std()`

## Common Pitfalls
Some common pitfalls to watch out for when working with NumPy include:
* Inconsistent array shapes and sizes when performing operations
* Using Python's built-in mathematical functions on NumPy arrays, which can lead to slower performance
* Not using vectorized operations, which can lead to slower performance
* Not checking for `NaN` (Not a Number) or `inf` (infinity) values in arrays

## Related Concepts
Some related concepts to NumPy include:
* Pandas: a library for data manipulation and analysis
* SciPy: a library for scientific and engineering applications
* Matplotlib: a library for data visualization
* Scikit-learn: a library for machine learning
These libraries often work together with NumPy to provide a comprehensive set of tools for data analysis and scientific computing in Python.