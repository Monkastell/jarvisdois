from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.agents_routes import router as agents_router
from routes.ai_routes import router as ai_router
from routes.crm_routes import router as crm_router
from routes.evolution_routes import router as evolution_router
from routes.integration_connections_routes import router as integration_connections_router
from routes.prospeccao_routes import router as prospeccao_router
from routes.webhook_routes import router as webhook_router
from services.prospeccao.whatsapp_disparo_service import resume_running_disparos_on_startup

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await resume_running_disparos_on_startup()
    yield


app = FastAPI(title="JARVIS Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(evolution_router)
app.include_router(integration_connections_router)
app.include_router(webhook_router)
app.include_router(crm_router)
app.include_router(ai_router)
app.include_router(agents_router)
app.include_router(prospeccao_router)


@app.get("/")
def root():
    return {"ok": True, "service": "jarvis-backend"}