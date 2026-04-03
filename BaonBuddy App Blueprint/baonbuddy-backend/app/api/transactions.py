from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date
from app.database import get_db
from app.schemas.transaction import TransactionCreate, TransactionResponse, TransactionUpdate
from app.models.transaction import Transaction
from app.models.wallet import Wallet
from app.api.auth import get_current_user_id

router = APIRouter()

@router.get("/", response_model=List[TransactionResponse])
def get_transactions(
    wallet_id: Optional[int] = None,
    category_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user_id)
    
    if wallet_id:
        query = query.filter(Transaction.wallet_id == wallet_id)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    
    transactions = query.order_by(Transaction.date.desc()).limit(limit).all()
    
    result = []
    for t in transactions:
        t_dict = {
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
        }
        result.append(t_dict)
    
    return result

@router.post("/", response_model=TransactionResponse)
def create_transaction(
    transaction: TransactionCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    wallet = db.query(Wallet).filter(
        Wallet.id == transaction.wallet_id,
        Wallet.user_id == current_user_id
    ).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    db_transaction = Transaction(
        user_id=current_user_id,
        wallet_id=transaction.wallet_id,
        category_id=transaction.category_id,
        amount=transaction.amount,
        note=transaction.note,
        date=transaction.date
    )
    
    wallet.balance -= transaction.amount
    
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    
    return {
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
    }

@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    transaction_update: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user_id
    ).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    old_amount = transaction.amount
    old_wallet_id = transaction.wallet_id
    
    if transaction_update.wallet_id and transaction_update.wallet_id != old_wallet_id:
        old_wallet = db.query(Wallet).filter(Wallet.id == old_wallet_id).first()
        old_wallet.balance += old_amount
        
        new_wallet = db.query(Wallet).filter(
            Wallet.id == transaction_update.wallet_id,
            Wallet.user_id == current_user_id
        ).first()
        if not new_wallet:
            raise HTTPException(status_code=404, detail="New wallet not found")
        
        transaction.wallet_id = transaction_update.wallet_id
        new_amount = transaction_update.amount if transaction_update.amount else old_amount
        new_wallet.balance -= new_amount
        transaction.amount = new_amount
    elif transaction_update.amount:
        wallet = db.query(Wallet).filter(Wallet.id == transaction.wallet_id).first()
        wallet.balance += old_amount
        wallet.balance -= transaction_update.amount
        transaction.amount = transaction_update.amount
    
    if transaction_update.category_id is not None:
        transaction.category_id = transaction_update.category_id
    if transaction_update.note is not None:
        transaction.note = transaction_update.note
    if transaction_update.date is not None:
        transaction.date = transaction_update.date
    
    db.commit()
    db.refresh(transaction)
    
    return {
        "id": transaction.id,
        "user_id": transaction.user_id,
        "wallet_id": transaction.wallet_id,
        "category_id": transaction.category_id,
        "amount": transaction.amount,
        "note": transaction.note,
        "date": transaction.date,
        "created_at": transaction.created_at,
        "updated_at": transaction.updated_at,
        "category_name": transaction.category.name if transaction.category else None,
        "category_icon": transaction.category.icon if transaction.category else None,
        "category_color": transaction.category.color if transaction.category else None,
        "wallet_name": transaction.wallet.name if transaction.wallet else None,
        "wallet_type": transaction.wallet.type.value if transaction.wallet else None
    }

@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user_id
    ).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    wallet = db.query(Wallet).filter(Wallet.id == transaction.wallet_id).first()
    wallet.balance += transaction.amount
    
    db.delete(transaction)
    db.commit()
    
    return {"message": "Transaction deleted successfully"}
