from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AlertBase(BaseModel):
    threshold: int
    message: str

class AlertCreate(AlertBase):
    wallet_id: Optional[int] = None

class AlertDismiss(BaseModel):
    dismissed: bool = True

class AlertResponse(AlertBase):
    id: int
    user_id: int
    wallet_id: Optional[int] = None
    triggered_at: datetime
    dismissed: bool
    dismissed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
