from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import scan, synthesizer, quiz, websocket
from app.services.scheduler import start_scheduler, shutdown_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    start_scheduler()
    yield
    # Shutdown actions
    shutdown_scheduler()

app = FastAPI(title="OmniVault AI 3-Agent Workspace Loop Engine", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route endpoints registrations map
app.include_router(scan.router)
app.include_router(synthesizer.router)
app.include_router(quiz.router)
app.include_router(websocket.router)

# Register Mutated Companion endpoints
from app.features.mutated_companion.routes import session as mutated_session
from app.features.mutated_companion.routes import curriculum as mutated_curriculum
from app.features.mutated_companion.routes import agent as mutated_agent

app.include_router(mutated_session.router)
app.include_router(mutated_curriculum.router)
app.include_router(mutated_agent.router)

@app.get("/")
def home_root():
    return {"status": "online", "engine": "OmniVault 3-Agent Loop Gateway"}