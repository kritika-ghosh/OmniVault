import gradio as gr
from app.main import app as fastapi_backend

# 1. Define the Gradio Interface
with gr.Blocks(title="OmniVault API Node") as demo:
    gr.Markdown("## 🚀 OmniVault Production REST API Node")
    gr.Markdown("Backend engine endpoints are live and responding to web queries.")

# 2. Mount the FastAPI backend onto Gradio's internal FastAPI app at the root "/"
# This serves both the Gradio UI and all FastAPI endpoints (/api/scan, /ws, etc.)
demo.app.mount("/", fastapi_backend)

# 3. Launch using native launch (with no parameters to let Gradio auto-detect the port)
demo.launch()
