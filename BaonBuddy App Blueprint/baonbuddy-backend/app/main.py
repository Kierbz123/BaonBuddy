from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.database import engine, Base
from app.api import api_router
from app.api.categories import seed_default_categories
from app.database import SessionLocal

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    os.makedirs("app/static/uploads", exist_ok=True)
    db = SessionLocal()
    try:
        seed_default_categories(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title="BaonBuddy API",
    description="Student Allowance Manager API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
app.mount("/uploads", StaticFiles(directory="app/static/uploads"), name="uploads")

@app.get("/")
def root():
    return {
        "message": "Welcome to BaonBuddy API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
