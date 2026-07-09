import numpy as np

def calculate_metrics(values: list[float]) -> dict:
    arr = np.array(values)
    return {
        "min": float(np.min(arr)),
        "max": float(np.max(arr)),
        "variance": float(np.var(arr))
    }
