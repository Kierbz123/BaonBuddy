from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from app.database import get_db
from app.schemas.transaction import TransactionCreate, TransactionResponse
from app.models.transaction import Transaction
from app.models.wallet import Wallet
from app.api.auth import get_current_user_id

router = APIRouter()

class SyncPushRequest(BaseModel):
    transactions: List[TransactionCreate]
    last_sync: datetime

class SyncPullResponse(BaseModel):
    transactions: List[TransactionResponse]
    last_sync: datetime

@router.post("/push")
def push_changes(
    data: SyncPushRequest,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    created_transactions = []
    
    for trans_data in data.transactions:
        wallet = db.query(Wallet).filter(
            Wallet.id == trans_data.wallet_id,
            Wallet.user_id == current_user_id
        ).first()
        if not wallet:
            continue
        
        db_transaction = Transaction(
            user_id=current_user_id,
            wallet_id=trans_data.wallet_id,
            category_id=trans_data.category_id,
            amount=trans_data.amount,
            note=trans_data.note,
            date=trans_data.date
        )
        
        wallet.balance -= trans_data.amount
        
        db.add(db_transaction)
        db.commit()
        db.refresh(db_transaction)
        
        created_transactions.append({
            "id": db_transaction.id,
            "user_id": db_transaction.user_id,
            "wallet_id": db_transaction.wallet_id,
            "category_id": db_transaction.category_id,
            "amount": db_transaction.amount,
            "note": db_transaction.note,
            "date": db_transaction.date,
            "created_at": db_transaction.created_at,
            "updated_at": db_transaction.updated_at,
            "category_name": db_transaction.category.name if db_transaction.category else None,
            "category_icon": db_transaction.category.icon if db_transaction.category else None,
            "category_color": db_transaction.category.color if db_transaction.category else None,
            "wallet_name": wallet.name,
            "wallet_type": wallet.type.value
        })
    
    return {
        "synced_count": len(created_transactions),
        "transactions": created_transactions,
        "sync_time": datetime.utcnow()
    }

@router.get("/pull")
def pull_changes(
    last_sync: datetime,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user_id,
        Transaction.created_at > last_sync
    ).all()
    
    result = []
    for t in transactions:
        result.append({
            "id": t.id,
            "user_id": t.user_id,
            "wallet_id": t.wallet_id,
            "category_id": t.category_id,
            "amount": t.amount,
            "note": t.note,
            "date": t.date,
            "created_at": t.created_at,
            "updated_at": t.updated_at,
            "category_name": t.category.name if t.category else None,
            "category_icon": t.category.icon if t.category else None,
            "category_color": t.category.color if t.category else None,
            "wallet_name": t.wallet.name if t.wallet else None,
            "wallet_type": t.wallet.type.value if t.wallet else None
        })
    
    return {
        "transactions": result,
        "last_sync": datetime.utcnow(),
        "count": len(result)
    }
