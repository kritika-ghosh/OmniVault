import os
import gradio as gr
from app.routers import scan, synthesizer, quiz, websocket
from app.services.scheduler import start_scheduler, shutdown_scheduler

# 1. Define the Gradio Interface
with gr.Blocks(title="OmniVault API Node") as demo:
    gr.Markdown("## 🚀 OmniVault Production REST API Node")
    gr.Markdown("Backend engine endpoints are live and responding to web queries.")

# 2. Register routers directly on Gradio's FastAPI application
# This serves all endpoints (/api/scan, /ws, etc.) at the root path safely
demo.app.include_router(scan.router)
demo.app.include_router(synthesizer.router)
demo.app.include_router(quiz.router)
demo.app.include_router(websocket.router)

# 3. Hook the active recall background scheduler to Gradio's app startup/shutdown
@demo.app.on_event("startup")
def startup_event():
    start_scheduler()

@demo.app.on_event("shutdown")
def shutdown_event():
    shutdown_scheduler()

# 4. Launch using debug=True to output tracebacks if there is a runtime crash
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    demo.launch(server_name="0.0.0.0", server_port=port, debug=True)
