import os
import uvicorn
import gradio as gr
from app.main import app as fastapi_backend

# 1. Define the Gradio Interface (for health check / dashboard UI)
with gr.Blocks(title="OmniVault API Node") as demo:
    gr.Markdown("## 🚀 OmniVault Production REST API Node")
    gr.Markdown("Backend engine endpoints are live and responding to web queries.")
    gr.Markdown("Direct all API requests to `/api/...` and WebSockets to `/ws`.")

# 2. Mount Gradio onto the FastAPI backend at '/internal-dashboard'
# This returns the combined FastAPI app (retaining lifespan hooks for the scheduler)
app = gr.mount_gradio_app(fastapi_backend, demo, path="/internal-dashboard")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
