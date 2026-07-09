import json
import sqlite3
import requests
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from fastapi import FastAPI
from pydantic import BaseModel
from utils import calculate_metrics

app = FastAPI()

class DataPoint(BaseModel):
    values: list[float]

@app.post("/analyze")
def analyze(data: DataPoint):
    # Use numpy
    arr = np.array(data.values)
    mean = np.mean(arr)
    std = np.std(arr)
    
    # Use requests to fetch helper info
    res = requests.get("https://api.github.com")
    
    # Use pandas
    df = pd.DataFrame(data.values, columns=["Val"])
    df_desc = df.describe().to_dict()
    
    # SQLite
    conn = sqlite3.connect("test.db")
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS logs (mean REAL, std REAL)")
    cursor.execute("INSERT INTO logs VALUES (?, ?)", (float(mean), float(std)))
    conn.commit()
    conn.close()
    
    # Matplotlib
    plt.figure()
    plt.plot(arr)
    plt.savefig("plot.png")
    plt.close()
    
    # Use custom utils
    metrics = calculate_metrics(data.values)
    
    return {
        "mean": mean,
        "std": std,
        "df": df_desc,
        "github_status": res.status_code,
        "metrics": metrics
    }
