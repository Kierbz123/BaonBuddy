from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas.wallet import WalletCreate, WalletResponse, WalletUpdate
from app.models.wallet import Wallet, WalletType
from app.api.auth import get_current_user_id

router = APIRouter()

@router.get("/", response_model=List[WalletResponse])
def get_wallets(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    wallets = db.query(Wallet).filter(Wallet.user_id == current_user_id).all()
    return wallets

@router.post("/", response_model=WalletResponse)
def create_wallet(
    wallet: WalletCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    db_wallet = Wallet(
        user_id=current_user_id,
        name=wallet.name,
        type=wallet.type,
        balance=wallet.balance
    )
    db.add(db_wallet)
    db.commit()
    db.refresh(db_wallet)
    return db_wallet

@router.get("/{wallet_id}", response_model=WalletResponse)
def get_wallet(
    wallet_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    wallet = db.query(Wallet).filter(
        Wallet.id == wallet_id,
        Wallet.user_id == current_user_id
    ).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return wallet

@router.put("/{wallet_id}", response_model=WalletResponse)
def update_wallet(
    wallet_id: int,
    wallet_update: WalletUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    wallet = db.query(Wallet).filter(
        Wallet.id == wallet_id,
        Wallet.user_id == current_user_id
    ).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    if wallet_update.name is not None:
        wallet.name = wallet_update.name
    if wallet_update.balance is not None:
        wallet.balance = wallet_update.balance
    
    db.commit()
    db.refresh(wallet)
    return wallet

@router.delete("/{wallet_id}")
def delete_wallet(
    wallet_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    wallet = db.query(Wallet).filter(
        Wallet.id == wallet_id,
        Wallet.user_id == current_user_id
    ).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    db.delete(wallet)
    db.commit()
    return {"message": "Wallet deleted successfully"}
