import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import data, campaigns, events, auth

app = FastAPI(title="Reachly CRM API", version="1.0.0")

# CORS — allow frontend origin
origins = [
    os.environ.get("FRONTEND_URL", "http://localhost:3000"),
    "https://*.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production via FRONTEND_URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(data.router)
app.include_router(campaigns.router)
app.include_router(events.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "reachly-backend"}

@app.get("/")
async def root():
    return {"status": "alive"}
