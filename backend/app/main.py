from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import scan, synthesizer # <-- Import our new router asset

app = FastAPI(title="OmniVault AI 3-Agent Workspace Loop Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permits Next.js browser execution pickers safely
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route mounting maps
app.include_router(scan.router)
app.include_router(synthesizer.router) # <-- Register Phase 2 router

@app.get("/")
def home_root():
    return {"status": "online", "engine": "OmniVault 3-Agent Loop Gateway"}