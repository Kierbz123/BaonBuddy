from fastapi import APIRouter
from app.api import auth, wallets, transactions, categories, analytics, alerts, sync, upload

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(wallets.router, prefix="/wallets", tags=["wallets"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(sync.router, prefix="/sync", tags=["sync"])
api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
