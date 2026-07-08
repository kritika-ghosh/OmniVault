import os
import gradio as gr
from app.main import app as fastapi_backend

# 1. Define the Gradio Interface
with gr.Blocks(title="OmniVault API Node") as demo:
    gr.Markdown("## 🚀 OmniVault Production REST API Node")
    gr.Markdown("Backend engine endpoints are live and responding to web queries.")

# 2. Mount the FastAPI backend onto Gradio's internal FastAPI app at the root "/"
# This serves both the Gradio UI and all FastAPI endpoints (/api/scan, /ws, etc.)
demo.app.mount("/", fastapi_backend)

# Export app for WSGI/ASGI servers (Hugging Face looks for app or demo)
app = demo.app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    # Native launch handles Hugging Face Space routing, hostnames, and ports automatically
    demo.launch(server_name="0.0.0.0", server_port=port)
