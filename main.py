import os
import sys

# Force unbuffered output so logs flush immediately
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

import uvicorn
import gradio as gr
from app.main import app as fastapi_backend

# 1. Define the Gradio Interface
with gr.Blocks(title="OmniVault API Node") as demo:
    gr.Markdown("## 🚀 OmniVault Production REST API Node")
    gr.Markdown("Backend engine endpoints are live and responding to web queries.")

# 2. Mount the Gradio app directly onto the pre-configured fastapi_backend
# This retains all CORS middleware, registered routers, and lifespan events!
app = gr.mount_gradio_app(fastapi_backend, demo, path="/")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    # Render binds dynamically, Hugging Face uses 7861
    is_huggingface = "SPACE_ID" in os.environ or "SPACE_HOST" in os.environ
    if is_huggingface and port == 7860:
        port = 7861
    uvicorn.run(app, host="0.0.0.0", port=port)
