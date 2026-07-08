from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import scan, synthesizer, quiz # <-- Add quiz here

app = FastAPI(title="OmniVault AI 3-Agent Workspace Loop Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route endpoints registrations map
app.include_router(scan.router)
app.include_router(synthesizer.router)
app.include_router(quiz.router) # <-- Register Phase 3 router asset

@app.get("/")
def home_root():
    return {"status": "online", "engine": "OmniVault 3-Agent Loop Gateway"}