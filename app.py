import os
import uvicorn
import gradio as gr
from app.main import app as fastapi_backend

# Microscopic interface to pass the Hugging Face health check container build
with gr.Blocks(title="OmniVault API Node") as UI_healthcheck:
    gr.Markdown("## 🚀 OmniVault Production REST API Node")
    gr.Markdown("Backend engine endpoints are live and responding to web queries.")

# Mount your actual FastAPI application directly onto the core root path (/)
app = gr.mount_gradio_app(fastapi_backend, UI_healthcheck, path="/internal-dashboard")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
