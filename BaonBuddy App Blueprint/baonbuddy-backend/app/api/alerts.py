from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database import get_db
from app.schemas.alert import AlertCreate, AlertResponse, AlertDismiss
from app.models.alert import Alert
from app.models.wallet import Wallet
from app.api.auth import get_current_user_id

router = APIRouter()

@router.get("/", response_model=List[AlertResponse])
def get_alerts(
    dismissed: bool = False,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    alerts = db.query(Alert).filter(
        Alert.user_id == current_user_id,
        Alert.dismissed == dismissed
    ).order_by(Alert.triggered_at.desc()).all()
    return alerts

@router.post("/", response_model=AlertResponse)
def create_alert(
    alert: AlertCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    db_alert = Alert(
        user_id=current_user_id,
        threshold=alert.threshold,
        message=alert.message,
        wallet_id=alert.wallet_id
    )
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert

@router.put("/{alert_id}/dismiss", response_model=AlertResponse)
def dismiss_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    alert = db.query(Alert).filter(
        Alert.id == alert_id,
        Alert.user_id == current_user_id
    ).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.dismissed = True
    alert.dismissed_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    return alert

@router.delete("/{alert_id}")
def delete_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    alert = db.query(Alert).filter(
        Alert.id == alert_id,
        Alert.user_id == current_user_id
    ).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted successfully"}

def check_low_balance_alert(db: Session, user_id: int, wallet_id: int, thresholds: List[int] = [50, 25, 10]):
    wallet = db.query(Wallet).filter(Wallet.id == wallet_id, Wallet.user_id == user_id).first()
    if not wallet:
        return
    
    balance = float(wallet.balance)
    
    for threshold in thresholds:
        if balance <= threshold:
            existing_alert = db.query(Alert).filter(
                Alert.user_id == user_id,
                Alert.wallet_id == wallet_id,
                Alert.threshold == threshold,
                Alert.dismissed == False
            ).first()
            
            if not existing_alert:
                alert = Alert(
                    user_id=user_id,
                    wallet_id=wallet_id,
                    threshold=threshold,
                    message=f"Your {wallet.name} wallet balance is below ₱{threshold}!"
                )
                db.add(alert)
    
    db.commit()
